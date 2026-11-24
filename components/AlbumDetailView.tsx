import { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  Music,
  Clock,
  Sparkles,
  Plus,
  Search,
  X,
  ArrowUpAZ,
  CalendarArrowDown,
  CalendarArrowUp,
  ListOrdered,
} from 'lucide-react';
import { supabase } from '@/supabase';
import { useAudio } from '@/context/AudioContext';
import type { Track } from '@/types/audio';

type SortMode = 'default' | 'alpha_asc' | 'date_desc' | 'date_asc';

interface AlbumDetailViewProps {
  albumId: string;
  onBack: () => void;
  onOpenPlaylistModal: (track: Track) => void;
}

const DEFAULT_ARTWORK =
  'https://images.pexels.com/photos/426976/pexels-photo-426976.jpeg?auto=compress&cs=tinysrgb&w=240';

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  january: 0,
  ene: 0,
  enero: 0,
  feb: 1,
  february: 1,
  febrero: 1,
  mar: 2,
  march: 2,
  marzo: 2,
  apr: 3,
  april: 3,
  abr: 3,
  abril: 3,
  may: 4,
  mayo: 4,
  jun: 5,
  june: 5,
  junio: 5,
  jul: 6,
  july: 6,
  julio: 6,
  aug: 7,
  august: 7,
  ago: 7,
  agosto: 7,
  sep: 8,
  sept: 8,
  september: 8,
  septiembre: 8,
  oct: 9,
  october: 9,
  octubre: 9,
  nov: 10,
  november: 10,
  noviembre: 10,
  dec: 11,
  december: 11,
  dic: 11,
  diciembre: 11,
};

function parseTrackTimestamp(rawItem: any, title: string): number | null {
  const rawDate = rawItem?.created_at || rawItem?.date;
  if (rawDate) {
    const parsed = Date.parse(rawDate);
    if (!Number.isNaN(parsed)) return parsed;
  }

  const match = title.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|mayo|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)\s+(\d{1,2}),?\s+(\d{4})\b/i
  );

  if (match) {
    const monthIndex = MONTH_MAP[match[1].toLowerCase()];
    const day = Number(match[2]);
    const year = Number(match[3]);
    if (monthIndex !== undefined && day >= 1 && day <= 31) {
      return new Date(year, monthIndex, day).getTime();
    }
  }

  return null;
}

interface TrackWithMeta extends Track {
  _timestamp: number | null;
}

export function AlbumDetailView({ albumId, onBack, onOpenPlaylistModal }: AlbumDetailViewProps) {
  const [album, setAlbum] = useState<any>(null);
  const [tracks, setTracks] = useState<TrackWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('default');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const audio = useAudio();

  useEffect(() => {
    void fetchAlbumAndTracks();
  }, [albumId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchAlbumAndTracks = async () => {
    setIsLoading(true);
    try {
      const { data: albumData, error: albumError } = await supabase
        .from('playlists_albums')
        .select('*')
        .eq('id', albumId)
        .single();

      if (albumError) throw albumError;
      setAlbum(albumData);

      const { data: tracksData, error: tracksError } = await supabase
        .from('creator_content')
        .select('*')
        .eq('album_id', albumId)
        .order('track_number', { ascending: true });

      if (tracksError) throw tracksError;

      const formattedTracks: TrackWithMeta[] = (tracksData || []).map((item) => {
        const title = item.title || '';
        return {
          id: item.id,
          title,
          artist: item.artist || albumData?.author || 'Sanctify',
          audioUrl: item.file_url,
          file_url: item.file_url,
          artworkUrl: item.artwork_url || albumData?.artwork_url || DEFAULT_ARTWORK,
          duration: item.duration || 0,
          category: item.category || 'music',
          lyrics: item.lyrics || item.description,
          _timestamp: parseTrackTimestamp(item, title),
        };
      });

      setTracks(formattedTracks);
    } catch (err) {
      console.error('Error al cargar detalle del álbum:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const visibleTracks = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();

    const filtered = normalized
      ? tracks.filter(
          (t) =>
            t.title.toLowerCase().includes(normalized) ||
            (t.artist || '').toLowerCase().includes(normalized)
        )
      : [...tracks];

    if (sortMode === 'default') return filtered;

    if (sortMode === 'alpha_asc') {
      return [...filtered].sort((a, b) =>
        a.title.localeCompare(b.title, 'es', { sensitivity: 'base', numeric: true })
      );
    }

    const dir = sortMode === 'date_desc' ? -1 : 1;
    return [...filtered].sort((a, b) => {
      if (a._timestamp !== null && b._timestamp !== null && a._timestamp !== b._timestamp) {
        return (a._timestamp - b._timestamp) * dir;
      }
      if (a._timestamp !== null && b._timestamp === null) return -1;
      if (a._timestamp === null && b._timestamp !== null) return 1;
      return a.title.localeCompare(b.title, 'es', { sensitivity: 'base', numeric: true });
    });
  }, [tracks, searchQuery, sortMode]);

  const handlePlayAll = () => {
    if (visibleTracks.length > 0 && audio?.playTrack) {
      audio.playTrack(visibleTracks[0], visibleTracks, {
        type: 'album',
        title: album?.title || 'Álbum',
      });
      audio.openFullScreen();
    }
  };

  const handlePlaySingle = (track: Track) => {
    if (audio?.playTrack) {
      audio.playTrack(track, visibleTracks, {
        type: 'album',
        title: album?.title || 'Álbum',
      });
      audio.openFullScreen();
    }
  };

  const sortButtons: { id: SortMode; label: string; icon: typeof ListOrdered }[] = [
    { id: 'default', label: 'Orden', icon: ListOrdered },
    { id: 'alpha_asc', label: 'A–Z', icon: ArrowUpAZ },
    { id: 'date_desc', label: 'Fecha: Mayor a menor', icon: CalendarArrowDown },
    { id: 'date_asc', label: 'Fecha: Menor a mayor', icon: CalendarArrowUp },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center text-zinc-400">
        <p className="animate-pulse text-sm font-semibold">Cargando contenido del álbum...</p>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] p-6 text-white text-center flex flex-col items-center justify-center space-y-4">
        <p className="text-zinc-400 text-sm">No se encontró el álbum o podcast solicitado.</p>
        <button
          type="button"
          onClick={onBack}
          className="text-[#3CC8F5] underline text-xs font-bold cursor-pointer hover:opacity-80"
        >
          Volver a la Biblioteca
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white pb-32 animate-in fade-in duration-300">
      {/* Botón de Regresar y Barra Superior */}
      <div className="sticky top-0 z-30 bg-[#0A0A0B]/90 backdrop-blur-md px-4 py-4 flex items-center justify-between gap-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer text-white shrink-0"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="truncate">
            <h2 className="font-bold truncate text-sm text-white">{album.title}</h2>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
              {album.type || 'Álbum'}
            </p>
          </div>
        </div>

        {/* Lupa de acceso directo en barra superior */}
        <button
          type="button"
          onClick={() => searchInputRef.current?.focus()}
          aria-label="Buscar en esta colección"
          title="Buscar pista (Ctrl/Cmd + K)"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-[#3CC8F5] hover:text-black transition-colors cursor-pointer text-white shrink-0"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      {/* Cabecera del Álbum / Podcast */}
      <div className="px-4 sm:px-8 pt-6 pb-8 bg-gradient-to-b from-zinc-800/40 via-zinc-900/20 to-[#0A0A0B] flex flex-col sm:flex-row items-center sm:items-end gap-6">
        <img
          src={album.artwork_url || DEFAULT_ARTWORK}
          alt={album.title}
          className="w-48 h-48 sm:w-56 sm:h-56 rounded-3xl object-cover shadow-2xl border border-white/10 shrink-0 aspect-square"
        />
        <div className="text-center sm:text-left flex-1">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#3CC8F5]">
            {album.type || 'Álbum'}
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold mt-2 text-white leading-tight">
            {album.title}
          </h1>
          {album.author && (
            <p className="text-sm font-medium text-zinc-300 mt-1">{album.author}</p>
          )}
          {album.description && (
            <p className="text-xs text-zinc-400 mt-2 max-w-xl leading-relaxed">
              {album.description}
            </p>
          )}
          <p className="text-xs text-zinc-500 mt-3 font-semibold">
            {tracks.length} {tracks.length === 1 ? 'pista disponible' : 'pistas disponibles'}
          </p>
        </div>
      </div>

      {/* Acciones del Álbum: Reproducir todo + Lupa Buscador al lado + Filtros rápidos */}
      <div className="px-4 sm:px-8 py-3 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="button"
            onClick={handlePlayAll}
            disabled={visibleTracks.length === 0}
            className="flex items-center justify-center gap-2.5 bg-[#3CC8F5] hover:bg-[#32b0d8] text-black font-bold px-7 py-3 rounded-full transition-all shadow-lg shadow-[#3CC8F5]/20 disabled:opacity-50 cursor-pointer hover:scale-[1.02] shrink-0"
          >
            <Play className="h-5 w-5 fill-black" /> Reproducir todo
          </button>

          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar pista o episodio..."
              aria-label="Buscar pista o episodio en este álbum"
              className="w-full rounded-full border border-white/15 bg-zinc-900/90 pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-[#3CC8F5]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            role="group"
            aria-label="Ordenar pistas"
            className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide"
          >
            {sortButtons.map(({ id, label, icon: Icon }) => {
              const active = sortMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSortMode(id)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-[#3CC8F5]/20 text-[#3CC8F5] border border-[#3CC8F5]'
                      : 'bg-zinc-900/70 text-zinc-400 border border-white/10 hover:border-white/25 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <span className="text-[11px] text-zinc-400">
            Mostrando <strong className="text-white">{visibleTracks.length}</strong> de{' '}
            {tracks.length}
          </span>
        </div>
      </div>

      {/* Lista de Pistas Relacionadas */}
      <div className="px-4 sm:px-8 mt-3">
        <div className="border-t border-white/10 pt-4">
          <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 border-b border-white/5 mb-2">
            <span>#</span>
            <span>Título</span>
            <span className="flex items-center gap-1 justify-end">
              <Clock className="h-3.5 w-3.5" />
            </span>
          </div>

          {visibleTracks.length > 0 ? (
            <div className="space-y-1">
              {visibleTracks.map((track, index) => {
                const isActive = audio?.currentTrack?.id === track.id;
                const isPlaying = isActive && audio?.isPlaying;

                return (
                  <div
                    key={track.id}
                    onClick={() => handlePlaySingle(track)}
                    className={`grid grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer group ${
                      isActive ? 'bg-[#3CC8F5]/10 border border-[#3CC8F5]/30' : ''
                    }`}
                  >
                    <span className="text-sm font-semibold text-zinc-500 group-hover:text-[#3CC8F5] w-5 text-center">
                      {isActive && isPlaying ? (
                        <Sparkles className="h-4 w-4 text-[#3CC8F5] animate-spin inline-block" />
                      ) : (
                        index + 1
                      )}
                    </span>

                    <div className="min-w-0">
                      <p
                        className={`text-sm font-bold truncate transition-colors ${
                          isActive ? 'text-[#3CC8F5]' : 'text-white group-hover:text-[#3CC8F5]'
                        }`}
                      >
                        {track.title}
                      </p>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">{track.artist}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {onOpenPlaylistModal && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPlaylistModal(track);
                          }}
                          className="h-8 w-8 flex items-center justify-center rounded-full bg-white/5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20 hover:text-white cursor-pointer"
                          title="Agregar a mi lista"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isActive) {
                            audio.togglePlayPause();
                          } else {
                            handlePlaySingle(track);
                          }
                        }}
                        className={`h-8 w-8 flex items-center justify-center rounded-full shadow-md transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#3CC8F5] text-black opacity-100'
                            : 'bg-white/10 text-white opacity-0 group-hover:opacity-100 hover:bg-[#3CC8F5] hover:text-black'
                        }`}
                        aria-label="Reproducir pista"
                      >
                        {isActive && isPlaying ? (
                          <Pause className="h-3.5 w-3.5 fill-current" />
                        ) : (
                          <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-3xl mt-4 space-y-3">
              <Music className="h-8 w-8 text-zinc-600 mx-auto" />
              <p className="text-zinc-400 text-sm font-medium">
                {searchQuery.trim()
                  ? `No se encontraron pistas para "${searchQuery.trim()}".`
                  : 'Este álbum aún no tiene pistas asociadas.'}
              </p>
              {(searchQuery.trim() || sortMode !== 'default') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSortMode('default');
                  }}
                  className="text-xs font-bold text-[#3CC8F5] underline cursor-pointer"
                >
                  Restablecer búsqueda y orden
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}