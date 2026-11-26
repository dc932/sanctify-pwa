import { useEffect, useRef, useState } from 'react';
import {
  Check,
  FileAudio,
  FileVideo,
  FileText,
  Music,
  Video,
  BookOpen,
  Upload,
  X,
  FileCode,
  Layers,
  Disc,
  Radio,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { ACC, metaCategories, liturgicalTimes } from './types';
import { supabase } from '../../supabase';
import { uploadToR2 } from '../../r2';

type UploadType = 'audio' | 'video' | 'lecture';
type CreationMode = 'single' | 'batch';
type AlbumType = 'album' | 'podcast';

const DEFAULT_ARTWORK =
  'https://images.pexels.com/photos/426976/pexels-photo-426976.jpeg?auto=compress&cs=tinysrgb&w=600';

const lectureCategories = [
  'Lecturas',
  'Parábolas',
  'Salmos',
  'Divina Misericordia',
  'Reflexiones',
  'Blog',
  'María',
  'Sagrado Corazón',
];

const typeButtons: { key: UploadType; label: string; icon: typeof Music; accept: string }[] = [
  { key: 'audio', label: 'Audiograma / Audio', icon: Music, accept: '.mp3,.wav,.aac' },
  { key: 'video', label: 'Video', icon: Video, accept: '.mp4' },
  { key: 'lecture', label: 'Lectura / Doc', icon: BookOpen, accept: '.pdf,.doc,.docx,.mp3,.wav' },
];

function isValidUploadFile(candidate: unknown): candidate is File {
  return candidate instanceof File && candidate.size > 0;
}

function getDefaultBatchCategory(type: AlbumType): string {
  if (type === 'podcast') {
    const match = metaCategories.find((c) => c.toLowerCase().includes('podcast'));
    return match || 'Podcast';
  }
  const match = metaCategories.find(
    (c) => c.toLowerCase().includes('música') || c.toLowerCase().includes('musica')
  );
  return match || 'Música';
}

function AudioWaveform({ url, onDuration }: { url: string; onDuration: (d: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<import('wavesurfer.js').default | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let destroyed = false;
    async function init() {
      if (!containerRef.current) return;
      const WaveSurfer = (await import('wavesurfer.js')).default;
      if (destroyed || !containerRef.current) return;
      const ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: '#52525b',
        progressColor: ACC,
        cursorColor: ACC,
        cursorWidth: 2,
        height: 80,
        barWidth: 2,
        barGap: 2,
        barRadius: 2,
        url,
      });
      waveRef.current = ws;
      ws.on('ready', () => {
        if (destroyed) return;
        setIsReady(true);
        onDuration(ws.getDuration());
      });
      ws.on('play', () => setIsPlaying(true));
      ws.on('pause', () => setIsPlaying(false));
      ws.on('finish', () => setIsPlaying(false));
    }
    void init();
    return () => {
      destroyed = true;
      waveRef.current?.destroy();
      waveRef.current = null;
    };
  }, [url, onDuration]);

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="rounded-xl bg-zinc-900 p-3" />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => waveRef.current?.playPause()}
          disabled={!isReady}
          className="flex h-9 w-9 items-center justify-center rounded-full text-black disabled:opacity-40 cursor-pointer"
          style={{ background: ACC }}
        >
          {isPlaying ? (
            <span className="flex gap-0.5">
              <span className="h-3 w-1 rounded-sm bg-black" />
              <span className="h-3 w-1 rounded-sm bg-black" />
            </span>
          ) : (
            <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <span className="text-xs text-zinc-500">
          {isReady ? 'Audiograma interactivo listo' : 'Cargando ondas...'}
        </span>
      </div>
    </div>
  );
}

export default function UploadView() {
  const [mode, setMode] = useState<CreationMode>('single');
  const [uploadType, setUploadType] = useState<UploadType>('audio');
  const [dragging, setDragging] = useState(false);

  // Estados de archivo individual
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfName, setPdfName] = useState('');
  const [lyricsFile, setLyricsFile] = useState<File | null>(null);
  const [lyricsName, setLyricsName] = useState('');

  // Estados de miniatura / Portada individual
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>(DEFAULT_ARTWORK);

  // Metadatos individuales
  const [title, setTitle] = useState('');
  const [contentBody, setContentBody] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(metaCategories[0]);
  const [liturgical, setLiturgical] = useState(liturgicalTimes[0]);
  const [biblePassage, setBiblePassage] = useState('');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('');
  const [trackNumber, setTrackNumber] = useState<string>('');

  // Estados para Carga Masiva (Álbum / Serie)
  const [albumType, setAlbumType] = useState<AlbumType>('album');
  const [batchCategory, setBatchCategory] = useState<string>(() => getDefaultBatchCategory('album'));
  const [batchTitle, setBatchTitle] = useState('');
  const [batchCreator, setBatchCreator] = useState('');
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchThumbFile, setBatchThumbFile] = useState<File | null>(null);
  const [batchThumbUrl, setBatchThumbUrl] = useState<string>('');
  const [progressText, setProgressText] = useState<string>('');

  const [albumsList, setAlbumsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    async function fetchAlbums() {
      try {
        const { data, error } = await supabase
          .from('playlists_albums')
          .select('id, title, type')
          .order('title', { ascending: true });
        if (!error && data) setAlbumsList(data);
      } catch (err) {
        console.error('Error al cargar álbumes:', err);
      }
    }
    void fetchAlbums();
  }, []);

  useEffect(() => {
    if (uploadType === 'lecture') {
      setCategory('Lecturas');
    } else {
      setCategory(metaCategories[0]);
    }
  }, [uploadType]);

  // Sincroniza la categoría sugerida al alternar entre Álbum Musical y Canal / Serie de Podcast
  useEffect(() => {
    setBatchCategory(getDefaultBatchCategory(albumType));
  }, [albumType]);

  useEffect(() => {
    return () => {
      if (fileUrl && fileUrl.startsWith('blob:')) URL.revokeObjectURL(fileUrl);
      if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
        URL.revokeObjectURL(thumbnailPreview);
      }
      if (batchThumbUrl && batchThumbUrl.startsWith('blob:')) {
        URL.revokeObjectURL(batchThumbUrl);
      }
    };
  }, [fileUrl, thumbnailPreview, batchThumbUrl]);

  const handleBatchFilesInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const validFiles = Array.from(e.target.files).filter(isValidUploadFile);
    setBatchFiles((prev) => [...prev, ...validFiles]);
    e.target.value = '';
  };

  const removeBatchFile = (index: number) => {
    setBatchFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setProgressText('');

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('La sesión ha expirado. Por favor, vuelve a iniciar sesión.');
      }
      const userId = session.user.id;

      if (mode === 'single') {
        if (!title.trim()) {
          alert('Por favor ingresa un título para la publicación.');
          return;
        }
        if (uploadType !== 'lecture' && !isValidUploadFile(file)) {
          alert('Por favor selecciona un archivo multimedia válido.');
          return;
        }

        let uploadedFileUrl: string | null = null;
        if (isValidUploadFile(file)) {
          setProgressText('Subiendo archivo multimedia a R2...');
          uploadedFileUrl = await uploadToR2(file, 'media');
        } else if (isValidUploadFile(pdfFile)) {
          setProgressText('Subiendo documento a R2...');
          uploadedFileUrl = await uploadToR2(pdfFile, 'documents');
        }

        let uploadedLyricsUrl: string | null = null;
        if (isValidUploadFile(lyricsFile)) {
          setProgressText('Subiendo archivo de letras/sincronización a R2...');
          uploadedLyricsUrl = await uploadToR2(lyricsFile, 'lyrics');
        }

        let uploadedThumbnailUrl = DEFAULT_ARTWORK;
        if (isValidUploadFile(thumbnailFile)) {
          setProgressText('Subiendo portada a R2...');
          uploadedThumbnailUrl = await uploadToR2(thumbnailFile, 'artworks');
        }

        setProgressText('Guardando publicación...');
        const { data: contentData, error: dbError } = await supabase
          .from('creator_content')
          .insert({
            user_id: userId,
            title: title.trim(),
            description: description.trim() || null,
            content: uploadType === 'lecture' ? contentBody : null,
            file_url: uploadedFileUrl,
            lyrics_url: uploadedLyricsUrl,
            artwork_url: uploadedThumbnailUrl,
            category,
            bible_verse: biblePassage.trim() || null,
            album_id: selectedAlbumId || null,
            track_number: trackNumber ? parseInt(trackNumber, 10) : null,
            status: 'under_review',
          })
          .select()
          .single();

        if (dbError) throw dbError;

        await supabase.from('admin_notifications').insert({
          title: 'Nuevo contenido para revisión',
          message: `Se ha enviado una nueva publicación: "${title.trim()}" (${uploadType}).`,
          type: 'content_review',
          reference_id: contentData?.id,
          read: false,
        });
      } else {
        const cleanBatchTitle = batchTitle.trim();
        if (!cleanBatchTitle) {
          alert('Por favor ingresa el título del Álbum o Serie.');
          return;
        }
        if (batchFiles.length === 0) {
          alert('Por favor selecciona al menos una pista o episodio.');
          return;
        }

        const sanitizedBatchFiles = batchFiles.filter(isValidUploadFile);
        if (sanitizedBatchFiles.length === 0) {
          alert('Ninguno de los archivos seleccionados es un archivo válido.');
          return;
        }

        let albumArtwork = DEFAULT_ARTWORK;
        if (isValidUploadFile(batchThumbFile)) {
          setProgressText('Subiendo portada del álbum a R2...');
          albumArtwork = await uploadToR2(batchThumbFile, 'artworks');
        }

        setProgressText('Creando contenedor de álbum/serie...');
        const { data: albumData, error: albumError } = await supabase
          .from('playlists_albums')
          .insert({
            user_id: userId,
            title: cleanBatchTitle,
            description: batchCreator.trim() ? `Creador / Artista: ${batchCreator.trim()}` : null,
            artwork_url: albumArtwork,
            type: albumType === 'album' ? 'album' : 'podcast',
          })
          .select()
          .single();

        if (albumError) throw albumError;
        const newAlbumId = albumData.id;

        const selectedBatchCategory = batchCategory || getDefaultBatchCategory(albumType);

        for (let i = 0; i < sanitizedBatchFiles.length; i++) {
          const trackFile = sanitizedBatchFiles[i];
          const cleanTitle = trackFile.name.replace(/\.[^/.]+$/, '');
          setProgressText(
            `Subiendo pista ${i + 1} de ${sanitizedBatchFiles.length}: ${cleanTitle}...`
          );

          const trackPublicUrl = await uploadToR2(trackFile, 'media');

          const { error: trackError } = await supabase.from('creator_content').insert({
            user_id: userId,
            title: cleanTitle,
            description: `Pista del ${albumType === 'podcast' ? 'podcast/serie' : 'álbum'}: ${cleanBatchTitle}`,
            file_url: trackPublicUrl,
            artwork_url: albumArtwork,
            category: selectedBatchCategory,
            album_id: newAlbumId,
            track_number: i + 1,
            status: 'under_review',
          });

          if (trackError) {
            throw new Error(`Error al registrar la pista "${cleanTitle}": ${trackError.message}`);
          }
        }

        await supabase.from('admin_notifications').insert({
          title: 'Nuevo Álbum / Serie en Lote',
          message: `Se ha creado el álbum "${cleanBatchTitle}" (${selectedBatchCategory}) con ${sanitizedBatchFiles.length} pistas pendientes de revisión.`,
          type: 'content_review',
          reference_id: newAlbumId,
          read: false,
        });
      }

      setProgressText('');
      setPublished(true);
      setTimeout(() => {
        setPublished(false);
        setTitle('');
        setDescription('');
        setContentBody('');
        setBiblePassage('');
        setSelectedAlbumId('');
        setTrackNumber('');
        setFile(null);
        setFileUrl(null);
        setFileName('');
        setPdfFile(null);
        setPdfName('');
        setLyricsFile(null);
        setLyricsName('');
        setThumbnailFile(null);
        setThumbnailPreview(DEFAULT_ARTWORK);
        setBatchFiles([]);
        setBatchTitle('');
        setBatchCreator('');
        setBatchThumbFile(null);
        setBatchThumbUrl('');
        setBatchCategory(getDefaultBatchCategory('album'));
      }, 3000);
    } catch (err: any) {
      console.error('Error detallado al publicar:', err);
      alert('Error al publicar: ' + (err?.message || 'Error de red en el dispositivo.'));
    } finally {
      setLoading(false);
      setProgressText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Selector Superior Limpio */}
      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-zinc-800 bg-[#121214] p-2">
        <button
          type="button"
          onClick={() => setMode('single')}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition-all cursor-pointer ${
            mode === 'single'
              ? 'bg-[#3CC8F5] text-black shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Music className="h-4 w-4" /> Subida Individual (1 Archivo)
        </button>
        <button
          type="button"
          onClick={() => setMode('batch')}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition-all cursor-pointer ${
            mode === 'batch'
              ? 'bg-amber-500 text-black shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Disc className="h-4 w-4" /> Subida Masiva / Álbum / Serie
        </button>
      </div>

      {/* MODO CARGA MASIVA (ÁLBUM / SERIE) */}
      {mode === 'batch' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-2xl border border-zinc-800 bg-[#121214] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-amber-500" />
              <h3 className="font-bold text-white">1. Configura tu Álbum o Canal</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAlbumType('album')}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all cursor-pointer ${
                  albumType === 'album'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                }`}
              >
                <Disc className="h-4 w-4" /> Álbum Musical
              </button>
              <button
                type="button"
                onClick={() => setAlbumType('podcast')}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all cursor-pointer ${
                  albumType === 'podcast'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                }`}
              >
                <Radio className="h-4 w-4" /> Canal / Serie de Podcast
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4 items-center">
              <div className="relative aspect-square overflow-hidden rounded-xl border border-dashed border-zinc-700 bg-zinc-900 flex flex-col items-center justify-center p-2 text-center group cursor-pointer">
                {batchThumbUrl ? (
                  <img
                    src={batchThumbUrl}
                    alt="Portada del álbum"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-zinc-500 mb-1" />
                    <span className="text-[10px] text-zinc-400 font-semibold">Portada del Álbum</span>
                    <span className="text-[9px] text-zinc-600">JPG o PNG (máx. 5MB)</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.gif,.avif"
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    if (isValidUploadFile(selected)) {
                      setBatchThumbFile(selected);
                      setBatchThumbUrl(URL.createObjectURL(selected));
                    }
                    e.target.value = '';
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Título del Álbum / Serie
                  </label>
                  <input
                    value={batchTitle}
                    onChange={(e) => setBatchTitle(e.target.value)}
                    placeholder="Ej. Cantos de Paz, Vol. 1"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Artista / Creador
                  </label>
                  <input
                    value={batchCreator}
                    onChange={(e) => setBatchCreator(e.target.value)}
                    placeholder="Ej. Coro San Jerónimo / P. Mateo"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Categoría del Contenido
                  </label>
                  <select
                    value={batchCategory}
                    onChange={(e) => setBatchCategory(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  >
                    {!metaCategories.includes('Podcast') && <option value="Podcast">Podcast</option>}
                    {!metaCategories.includes('Música') && <option value="Música">Música</option>}
                    {metaCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-[#121214] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileAudio className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-white">2. Selecciona las Pistas / Episodios</h3>
              </div>
              <label className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 transition-all cursor-pointer">
                <Plus className="h-4 w-4" /> Seleccionar Archivos
                <input
                  type="file"
                  multiple
                  accept=".mp3,.wav,.aac"
                  onChange={handleBatchFilesInput}
                  className="hidden"
                />
              </label>
            </div>

            {batchFiles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 py-12 text-center text-xs text-zinc-500">
                No has seleccionado pistas todavía. Puedes elegir múltiples archivos `.mp3` o `.wav` al mismo tiempo.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {batchFiles.map((itemFile, idx) => (
                  <div
                    key={`${itemFile.name}-${idx}`}
                    className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-3"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <span className="text-xs font-bold text-amber-500">{idx + 1}.</span>
                      <span className="text-xs text-white truncate">{itemFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBatchFile(idx)}
                      className="text-zinc-500 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODO PISTA / ARCHIVO INDIVIDUAL */}
      {mode === 'single' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Selector de tipo de contenido */}
          <div className="rounded-2xl border border-zinc-800 bg-[#121214] p-5">
            <h3 className="mb-4 font-bold text-white">Tipo de contenido</h3>
            <div className="grid grid-cols-3 gap-3">
              {typeButtons.map(({ key, label, icon: Icon, accept }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setUploadType(key);
                    setFileUrl(null);
                    setFile(null);
                    setFileName('');
                  }}
                  className="flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-xs font-bold transition-all text-center cursor-pointer"
                  style={
                    uploadType === key
                      ? { borderColor: ACC, backgroundColor: `${ACC}15`, color: ACC }
                      : { borderColor: '#3f3f46', color: '#a1a1aa' }
                  }
                >
                  <Icon className="h-6 w-6" />
                  {label}
                  <span className="text-[9px] font-normal text-zinc-500 truncate w-full">
                    {accept}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sección de Organización Opcional */}
          <div className="rounded-2xl border border-zinc-800 bg-[#121214] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#3CC8F5]" />
              <h3 className="font-bold text-white">Pertenece a un Álbum o Podcast (Opcional)</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Seleccionar Álbum / Podcast
                </label>
                <select
                  value={selectedAlbumId}
                  onChange={(e) => setSelectedAlbumId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#3CC8F5]"
                >
                  <option value="">-- Ninguno (Contenido independiente) --</option>
                  {albumsList.map((album) => (
                    <option key={album.id} value={album.id}>
                      {album.title} ({album.type})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Nº de Pista
                </label>
                <input
                  type="number"
                  min="1"
                  value={trackNumber}
                  onChange={(e) => setTrackNumber(e.target.value)}
                  placeholder="Ej. 1"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#3CC8F5]"
                />
              </div>
            </div>
          </div>

          {uploadType !== 'lecture' && !fileUrl && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const droppedFile = e.dataTransfer.files[0];
                if (isValidUploadFile(droppedFile)) {
                  setFile(droppedFile);
                  setFileName(droppedFile.name);
                  setFileUrl(URL.createObjectURL(droppedFile));
                }
              }}
              className="rounded-2xl border-2 border-dashed transition-colors"
              style={{
                borderColor: dragging ? ACC : '#3f3f46',
                background: dragging ? `${ACC}08` : '#0f0f11',
              }}
            >
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 py-12 text-center">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background: `${ACC}15`, color: ACC }}
                >
                  <Upload className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-bold text-white">Arrastra tu audiograma o archivo de audio aquí</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {uploadType === 'audio' ? 'Audiograma HD (MP3, WAV, AAC)' : 'MP4'} · O haz clic para seleccionar
                  </p>
                </div>
                <input
                  type="file"
                  accept={uploadType === 'audio' ? '.mp3,.wav,.aac' : '.mp4'}
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (isValidUploadFile(selectedFile)) {
                      setFile(selectedFile);
                      setFileName(selectedFile.name);
                      setFileUrl(URL.createObjectURL(selectedFile));
                    }
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {uploadType !== 'lecture' && fileUrl && (
            <div className="rounded-2xl border border-zinc-800 bg-[#121214] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {uploadType === 'audio' ? (
                    <FileAudio className="h-5 w-5" style={{ color: ACC }} />
                  ) : (
                    <FileVideo className="h-5 w-5" style={{ color: ACC }} />
                  )}
                  <span className="truncate text-sm font-semibold text-white">{fileName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFileUrl(null);
                    setFile(null);
                    setFileName('');
                  }}
                  className="text-zinc-500 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {uploadType === 'audio' && <AudioWaveform url={fileUrl} onDuration={() => {}} />}
            </div>
          )}

          {uploadType === 'audio' && (
            <div className="rounded-2xl border border-zinc-800 bg-[#121214] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">
                  Archivo de marcas de tiempo / sincronización (.lrc)
                </span>
                <FileCode className="h-4 w-4 text-[#3CC8F5]" />
              </div>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 py-3 text-xs font-medium text-zinc-400 hover:border-zinc-500 hover:text-white">
                <span className="truncate max-w-[220px]">
                  {lyricsName || 'Seleccionar archivo .lrc opcional'}
                </span>
                <input
                  type="file"
                  accept=".lrc,.txt"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (isValidUploadFile(f)) {
                      setLyricsFile(f);
                      setLyricsName(f.name);
                    }
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* SECCIÓN DE LECTURA / DOC */}
          {uploadType === 'lecture' && (
            <div className="rounded-2xl border border-zinc-800 bg-[#121214] p-5 space-y-4">
              <h3 className="font-bold text-white">Archivos y Contenido para la Lectura</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-2">
                  <span className="text-xs font-semibold text-zinc-300">Documento PDF / Archivo</span>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 py-3 text-xs font-medium text-zinc-400 hover:border-zinc-500 hover:text-white">
                    <FileText className="h-4 w-4" />
                    <span className="truncate max-w-[180px]">{pdfName || 'Seleccionar PDF/Doc'}</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (isValidUploadFile(f)) {
                          setPdfFile(f);
                          setPdfName(f.name);
                        }
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-2">
                  <span className="text-xs font-semibold text-zinc-300">
                    Imagen de Portada (Artwork)
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800">
                      <img
                        src={thumbnailPreview}
                        alt="Miniatura"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 py-3 text-xs font-medium text-zinc-400 hover:border-zinc-500 hover:text-white">
                      <Upload className="h-4 w-4" />
                      <span className="truncate max-w-[130px]">
                        {thumbnailFile ? thumbnailFile.name : 'Cambiar portada'}
                      </span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.gif,.avif"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (isValidUploadFile(f)) {
                            setThumbnailFile(f);
                            setThumbnailPreview(URL.createObjectURL(f));
                          }
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Texto / Transcripción de la Lectura (para Text-to-Speech y Vista de Texto)
                </label>
                <textarea
                  value={contentBody}
                  onChange={(e) => setContentBody(e.target.value)}
                  rows={5}
                  placeholder="Pega o escribe aquí el texto completo de la lectura para que la aplicación pueda leerlo en voz alta y mostrarlo en la interfaz..."
                  className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#3CC8F5]"
                />
              </div>
            </div>
          )}

          {/* Formulario de Metadatos Individuales */}
          <div className="rounded-2xl border border-zinc-800 bg-[#121214] p-5 space-y-4">
            <h3 className="font-bold text-white">Información del contenido</h3>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Título
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nombre de tu publicación"
                required={mode === 'single'}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#E0B95B]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Descripción / Resumen
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Cuéntale a tu audiencia de qué trata..."
                className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#E0B95B]"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#E0B95B]"
                >
                  {uploadType === 'lecture'
                    ? lectureCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))
                    : metaCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Tiempo litúrgico
                </label>
                <select
                  value={liturgical}
                  onChange={(e) => setLiturgical(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#E0B95B]"
                >
                  {liturgicalTimes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-black transition-transform hover:scale-[1.01] disabled:opacity-50 cursor-pointer"
        style={{ background: ACC }}
      >
        {loading ? (
          progressText || 'Enviando a revisión...'
        ) : published ? (
          <>
            <Check className="h-5 w-5" /> ¡Enviado a revisión con éxito!
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />{' '}
            {mode === 'single'
              ? 'Publicar contenido para Revisión'
              : 'Crear Álbum y Enviar Pistas en Lote'}
          </>
        )}
      </button>
    </form>
  );
}