import { useState, useEffect, useRef, useCallback, type MouseEvent } from 'react';
import {
  BookOpen,
  ChevronRight,
  ArrowLeft,
  FileText,
  Play,
  Pause,
  Eye,
  X,
  ChevronLeft,
  MoreVertical,
} from 'lucide-react';
import { supabase } from '../supabase';
import AddToPlaylistModal from './AddToPlaylistModal';
import { SacredHeartIcon } from './SacredHeartIcon';
import {
  usePdfAnnotations,
  PdfAnnotationToolbar,
  PdfAnnotatedPage,
  type PdfToolMode,
} from '@/components/PdfAnnotator';
import type { Track } from '@/types/audio';

interface LectureItem {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  artwork_url?: string;
  bible_verse?: string;
  pdf_url?: string;
  audio_url?: string;
  document_url?: string;
  file_url?: string;
}

interface LecturesViewProps {
  onClose: () => void;
}

const PAGE_SIZE = 9;
const DEFAULT_LECTURE_ARTWORK =
  'https://images.pexels.com/photos/426976/pexels-photo-426976.jpeg';
const CATEGORIES = [
  'Todas',
  'Parábolas',
  'Salmos',
  'Divina Misericordia',
  'Reflexiones',
  'Blog',
  'María',
  'Sagrado Corazón',
  'Lecturas',
];

function isPdfUrl(url?: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes('.pdf') || lower.includes('application/pdf');
}

function isAudioUrl(url?: string): boolean {
  if (!url || isPdfUrl(url)) return false;
  return /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(url);
}

function isImageUrl(url?: string): boolean {
  if (!url) return false;
  return /\.(jpeg|jpg|gif|png|webp)(\?|$)/i.test(url);
}

function mapContentRowToLecture(item: any): LectureItem {
  const fileUrl = item.file_url || item.audioUrl || item.pdf_url || '';
  const hasPdf = isPdfUrl(fileUrl) || Boolean(item.pdf_url);

  return {
    id: String(item.id),
    title: item.title,
    description: item.description || item.artist || '',
    content: item.content || item.lyrics || 'Contenido de lectura disponible.',
    category: item.category || 'Lecturas',
    artwork_url: item.artwork_url || item.artworkUrl,
    file_url: fileUrl,
    pdf_url: hasPdf ? item.pdf_url || fileUrl : '',
    audio_url: isAudioUrl(fileUrl) ? fileUrl : item.audio_url || '',
  };
}

export default function LecturesView({ onClose }: LecturesViewProps) {
  const [lectures, setLectures] = useState<LectureItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [activeLecture, setActiveLecture] = useState<LectureItem | null>(null);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Estado del visor de archivos y anotaciones PDF por usuario
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [selectedFileTitle, setSelectedFileTitle] = useState<string>('');
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [pdfPageNumber, setPdfPageNumber] = useState<number>(1);
  const [pdfTool, setPdfTool] = useState<PdfToolMode>('cursor');
  const [pdfColor, setPdfColor] = useState<string>('#3CC8F5');

  const [session, setSession] = useState<any>(null);
  const [selectedTrackForModal, setSelectedTrackForModal] = useState<Track | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const userId = session?.user?.id as string | undefined;

  const {
    annotations,
    saving: savingAnnotations,
    savedNotice: annotationsSaved,
    addAnnotation,
    updateAnnotationComment,
    deleteAnnotation,
  } = usePdfAnnotations(selectedDocId || selectedFileTitle || 'default_doc', userId);

  const stopMediaPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingAudioId(null);
    setIsSpeakingId(null);
  }, []);

  const fetchFavorites = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('track_id')
        .eq('user_id', uid);

      if (!error && data) {
        setFavorites(new Set(data.map((f) => String(f.track_id))));
      }
    } catch (err) {
      console.error('Error cargando favoritos:', err);
    }
  }, []);

  const handleOpenViewer = useCallback((url: string, title: string, docId?: string) => {
    if (!url) {
      alert('El archivo no está disponible.');
      return;
    }
    setSelectedDocId(docId || title);
    setSelectedFileTitle(title);
    setPdfPageNumber(1);
    setSelectedFileUrl(url);
  }, []);

  // Sesión y listener global (una sola vez)
  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user?.id) {
        void fetchFavorites(data.session.user.id);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession?.user?.id) {
        void fetchFavorites(nextSession.user.id);
      } else {
        setFavorites(new Set());
      }
    });

    const handleGlobalOpenLectura = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      if (!customEvent.detail) return;

      const lecture = mapContentRowToLecture(customEvent.detail);
      setActiveLecture(lecture);

      const fileUrl = lecture.pdf_url || lecture.file_url || '';
      if (isPdfUrl(fileUrl)) {
        handleOpenViewer(fileUrl, lecture.title, lecture.id);
      }
    };

    window.addEventListener('open-lecturas-view', handleGlobalOpenLectura);

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
      window.removeEventListener('open-lecturas-view', handleGlobalOpenLectura);
      stopMediaPlayback();
    };
  }, [fetchFavorites, handleOpenViewer, stopMediaPlayback]);

  // Carga paginada por categoría y página
  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      try {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from('creator_content')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, to);

        if (selectedCategory !== 'Todas') {
          query = query.ilike('category', `%${selectedCategory}%`);
        }

        const { data, error } = await query;
        if (!active) return;

        if (!error && data) {
          const formatted = data.map(mapContentRowToLecture);
          setHasMore(formatted.length === PAGE_SIZE);
          setLectures(formatted);
        }
      } catch (err) {
        console.error('Error al cargar la biblioteca de lecturas:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [page, selectedCategory]);

  const toggleFavorite = async (lecture: LectureItem, e: MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;

    const trackId = lecture.id;
    const isFav = favorites.has(trackId);

    try {
      if (isFav) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('track_id', trackId);

        if (!error) {
          setFavorites((prev) => {
            const next = new Set(prev);
            next.delete(trackId);
            return next;
          });
        }
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: userId, track_id: trackId });

        if (!error) {
          setFavorites((prev) => new Set(prev).add(trackId));
        }
      }
    } catch (err) {
      console.error('Error al actualizar favorito:', err);
    }
  };

  const mapLectureToTrack = (lecture: LectureItem): Track => ({
    id: lecture.id,
    title: lecture.title,
    artist: lecture.description || 'Comunidad Orante',
    artworkUrl: lecture.artwork_url || DEFAULT_LECTURE_ARTWORK,
    audioUrl: lecture.pdf_url || lecture.file_url || lecture.audio_url || '',
    duration: 0,
    category: 'blog',
  });

  const startChunkedTextToSpeech = (lecture: LectureItem) => {
    if (!('speechSynthesis' in window)) {
      alert('Tu navegador no soporta la lectura en voz alta.');
      return;
    }

    window.speechSynthesis.cancel();

    const descText =
      lecture.description && lecture.description !== lecture.content ? lecture.description : '';
    const fullText = `${lecture.title}. ${descText} ${lecture.content || ''}`.trim();

    if (!fullText) {
      alert('No hay texto disponible para reproducir.');
      return;
    }

    const sentences = fullText.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [fullText];
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length < 200) {
        currentChunk += sentence;
      } else {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
    if (chunks.length === 0) return;

    setIsSpeakingId(lecture.id);
    let index = 0;

    const speakNext = () => {
      if (index >= chunks.length) {
        setIsSpeakingId(null);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.lang = 'es-ES';
      utterance.rate = 0.95;

      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find((v) => v.lang.startsWith('es'));
      if (spanishVoice) utterance.voice = spanishVoice;

      utterance.onend = () => {
        index++;
        speakNext();
      };
      utterance.onerror = () => setIsSpeakingId(null);

      window.speechSynthesis.speak(utterance);
    };

    speakNext();
  };

  const handleAudioPlayback = (lecture: LectureItem, e: MouseEvent) => {
    e.stopPropagation();

    const isCurrentlyActive = isSpeakingId === lecture.id || playingAudioId === lecture.id;
    stopMediaPlayback();
    if (isCurrentlyActive) return;

    if (lecture.audio_url && isAudioUrl(lecture.audio_url)) {
      const player = new Audio(lecture.audio_url);
      audioRef.current = player;
      player
        .play()
        .then(() => setPlayingAudioId(lecture.id))
        .catch(() => startChunkedTextToSpeech(lecture));
      player.onended = () => setPlayingAudioId(null);
    } else {
      startChunkedTextToSpeech(lecture);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 text-white max-w-7xl mx-auto animate-in fade-in duration-200">
      <button
        type="button"
        onClick={() => {
          stopMediaPlayback();
          onClose();
        }}
        className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4 text-[#3CC8F5]" />
        Volver al inicio
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-[#E0B95B]" /> Lecturas Espirituales y Blog
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Explora reflexiones, meditaciones, audiogramas y documentos recomendados.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 max-w-2xl justify-end">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setPage(0);
                setSelectedCategory(cat);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#E0B95B] text-black shadow-lg shadow-[#E0B95B]/10'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-zinc-500">
          Cargando biblioteca de lecturas...
        </div>
      ) : lectures.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#121214] py-16 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
          <p className="text-sm font-bold text-zinc-300">No hay lecturas en esta categoría</p>
          <p className="text-xs text-zinc-500 mt-1">
            Pronto se agregarán nuevos contenidos y documentos.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {lectures.map((lecture) => {
              const isFavorite = favorites.has(lecture.id);
              const pdfSource = lecture.pdf_url || (isPdfUrl(lecture.file_url) ? lecture.file_url : '');

              return (
                <div
                  key={lecture.id}
                  onClick={() => {
                    setActiveLecture(lecture);
                    if (pdfSource) {
                      handleOpenViewer(pdfSource, lecture.title, lecture.id);
                    }
                  }}
                  className="group cursor-pointer rounded-2xl border border-emerald-500/30 bg-[#121214] overflow-hidden hover:border-emerald-500/60 transition-all flex flex-col justify-between relative"
                >
                  <button
                    type="button"
                    onClick={(e) => void toggleFavorite(lecture, e)}
                    className="absolute top-3 left-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all hover:bg-black cursor-pointer shadow-md z-20"
                    title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                  >
                    <SacredHeartIcon
                      className={`h-7 w-7 transition-transform ${
                        isFavorite ? 'scale-110 text-[#EF4444]' : 'text-white'
                      }`}
                      filled={isFavorite}
                    />
                  </button>

                  <div>
                    <div className="relative h-48 w-full overflow-hidden bg-zinc-900">
                      <img
                        src={lecture.artwork_url || DEFAULT_LECTURE_ARTWORK}
                        alt={lecture.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                      />
                      <span className="absolute top-3 right-12 bg-black/70 backdrop-blur-md text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-emerald-800/50 uppercase">
                        {lecture.category || 'Lectura / PDF'}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTrackForModal(mapLectureToTrack(lecture));
                        }}
                        className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all hover:bg-black cursor-pointer shadow-md z-10"
                        title="Guardar en carpetas o listas"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="p-5 space-y-2">
                      <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                        {lecture.title}
                      </h3>
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {lecture.description}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-2 flex items-center justify-between border-t border-zinc-800/60 mt-2">
                    <div className="flex items-center gap-2">
                      {pdfSource && (
                        <span className="flex items-center gap-1 text-[10px] bg-emerald-950 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-800/50 font-semibold">
                          <FileText className="h-3 w-3" /> Documento PDF
                        </span>
                      )}
                      {lecture.audio_url && (
                        <span className="flex items-center gap-1 text-[10px] bg-zinc-900 text-[#E0B95B] px-2.5 py-1 rounded-lg border border-zinc-800 font-semibold">
                          <Play className="h-3 w-3" /> Audio
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 group-hover:underline">
                      Abrir Lectura <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-40 cursor-pointer transition-all"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
            <span className="text-xs text-zinc-400 font-medium">Página {page + 1}</span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore || loading}
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-40 cursor-pointer transition-all"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}

      {/* Modal de Detalle de Lectura */}
      {activeLecture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-zinc-800 bg-[#121214] p-6 md:p-8 text-white shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800/50">
                {activeLecture.category || 'Lectura Espiritual'}
              </span>
              <button
                type="button"
                onClick={() => {
                  stopMediaPlayback();
                  setActiveLecture(null);
                }}
                className="text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800 cursor-pointer"
              >
                Cerrar ✕
              </button>
            </div>

            <div className="space-y-3">
              <h2 className="text-xl md:text-2xl font-extrabold">{activeLecture.title}</h2>
            </div>

            {activeLecture.artwork_url && (
              <div className="h-64 w-full rounded-2xl overflow-hidden border border-zinc-800 shadow-md">
                <img
                  src={activeLecture.artwork_url}
                  alt={activeLecture.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            {activeLecture.description && (
              <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl">
                <p className="text-xs text-zinc-300 italic leading-relaxed">
                  {activeLecture.description}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-1">
              {(activeLecture.pdf_url || activeLecture.file_url) && (
                <button
                  type="button"
                  onClick={() =>
                    handleOpenViewer(
                      activeLecture.pdf_url || activeLecture.file_url!,
                      activeLecture.title,
                      activeLecture.id
                    )
                  }
                  className="flex items-center gap-2 rounded-xl bg-emerald-600/20 border border-emerald-500/40 px-4 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-600/30 transition-all cursor-pointer"
                >
                  <Eye className="h-4 w-4" /> Ver documento completo (PDF)
                </button>
              )}

              <button
                type="button"
                onClick={(e) => handleAudioPlayback(activeLecture, e)}
                className="flex items-center gap-2 rounded-xl bg-[#E0B95B] px-4 py-2.5 text-xs font-bold text-black hover:opacity-90 transition-all cursor-pointer shadow-md"
              >
                {playingAudioId === activeLecture.id || isSpeakingId === activeLecture.id ? (
                  <>
                    <Pause className="h-4 w-4" /> Pausar Lectura
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" /> Escuchar Voz en Alto
                  </>
                )}
              </button>
            </div>

            <div className="text-sm text-zinc-300 leading-relaxed space-y-4 whitespace-pre-line bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/80">
              {activeLecture.content || 'Sin contenido de texto adicional.'}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  stopMediaPlayback();
                  setActiveLecture(null);
                }}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-all cursor-pointer"
              >
                Cerrar Lectura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visor de PDF con Herramientas de Subrayado y Notas por Usuario */}
      {selectedFileUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-4xl h-[85vh] rounded-3xl border border-zinc-800 bg-[#121214] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-900/60 gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white">Visualizador de Documento Completo</h3>
                <p className="text-xs text-emerald-400 truncate max-w-xl">{selectedFileTitle}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <a
                  href={selectedFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  Abrir en pestaña nueva ↗
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedFileUrl(null);
                    setSelectedFileTitle('');
                    setSelectedDocId('');
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 cursor-pointer transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="px-4 pt-3 bg-zinc-950 flex flex-wrap items-center justify-between gap-2">
              <div className="flex-1 min-w-[280px]">
                <PdfAnnotationToolbar
                  tool={pdfTool}
                  onToolChange={setPdfTool}
                  color={pdfColor}
                  onColorChange={setPdfColor}
                  saving={savingAnnotations}
                  savedNotice={annotationsSaved}
                  annotationsCount={annotations.length}
                />
              </div>

              <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs">
                <span className="text-zinc-400">Hoja/Sección:</span>
                <button
                  type="button"
                  onClick={() => setPdfPageNumber((p) => Math.max(1, p - 1))}
                  className="px-1.5 py-0.5 rounded bg-zinc-800 text-white hover:bg-zinc-700 cursor-pointer"
                >
                  -
                </button>
                <span className="font-bold text-white min-w-[20px] text-center">
                  {pdfPageNumber}
                </span>
                <button
                  type="button"
                  onClick={() => setPdfPageNumber((p) => p + 1)}
                  className="px-1.5 py-0.5 rounded bg-zinc-800 text-white hover:bg-zinc-700 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex-1 bg-zinc-950 p-3 relative overflow-auto flex items-center justify-center">
              {isImageUrl(selectedFileUrl) ? (
                <PdfAnnotatedPage
                  pageNumber={pdfPageNumber}
                  tool={pdfTool}
                  color={pdfColor}
                  annotations={annotations}
                  onCreateAnnotation={addAnnotation}
                  onUpdateComment={updateAnnotationComment}
                  onDeleteAnnotation={deleteAnnotation}
                >
                  <img
                    src={selectedFileUrl}
                    alt={selectedFileTitle}
                    className="max-h-[65vh] max-w-full object-contain rounded-xl"
                  />
                </PdfAnnotatedPage>
              ) : (
                <PdfAnnotatedPage
                  pageNumber={pdfPageNumber}
                  tool={pdfTool}
                  color={pdfColor}
                  annotations={annotations}
                  onCreateAnnotation={addAnnotation}
                  onUpdateComment={updateAnnotationComment}
                  onDeleteAnnotation={deleteAnnotation}
                >
                  <div className="w-[78vw] max-w-3xl h-[65vh] rounded-xl overflow-hidden border border-zinc-800 bg-white">
                    <iframe
                      src={`${selectedFileUrl}#page=${pdfPageNumber}&view=FitH`}
                      title={selectedFileTitle}
                      className="w-full h-full border-0"
                    />
                  </div>
                </PdfAnnotatedPage>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedTrackForModal && (
        <AddToPlaylistModal
          track={selectedTrackForModal}
          session={session}
          onClose={() => setSelectedTrackForModal(null)}
        />
      )}
    </div>
  );
}