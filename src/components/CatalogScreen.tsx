import { useState, useEffect } from 'react';
import { Play, Pause, Music, Mic, BookOpen, Video, Flame, Sparkles, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../supabase';
import { tracks as staticTracks } from '@/data/tracks';
import { useAudio } from '@/context/AudioContext';
import { useAuth } from '@/context/AuthContext';
import type { Track, TrackCategory } from '@/types/audio';
import { AlbumDetailView } from '@/components/AlbumDetailView';

interface CatalogScreenProps {
  initialCategory?: string;
  onSelectTrack?: (track: Track) => void;
  onOpenLibrary?: (category?: 'favorites' | 'music' | 'podcast' | 'blog' | 'video' | 'albums') => void;
  onOpenPlaylistModal?: (track: Track) => void;
}

const PAGE_SIZE = 10; // Bloques de 10 elementos para optimizar ancho de banda y rendimiento

export default function CatalogScreen({ 
  initialCategory = 'all',
  onOpenPlaylistModal
}: CatalogScreenProps) {
  const { session } = useAuth();
  const audio = useAudio();

  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);

  // Estados de Paginación
  const [page, setPage] = useState(0);
  const [hasMoreTracks, setHasMoreTracks] = useState(true);
  const [hasMoreAlbums, setHasMoreAlbums] = useState(true);

  // Cargar contenidos y álbumes desde Supabase con Paginación
  useEffect(() => {
    fetchCatalogData(0, activeCategory);
  }, [activeCategory]);

  const fetchCatalogData = async (pageIndex: number, categoryFilter: string) => {
    try {
      setLoading(true);
      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // 1. Obtener contenido publicado por creadores en Supabase con rango (.range)
      let query = supabase
        .from('creator_content')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data: dynamicContent, error } = await query;

      if (error) {
        console.error('Error obteniendo contenido dinámico:', error);
      }

      const formattedDynamicTracks: Track[] = (dynamicContent || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        artist: item.artist || item.category || 'Creador Sanctify',
        artworkUrl:
          item.artwork_url ||
          'https://images.pexels.com/photos/426976/pexels-photo-426976.jpeg?auto=compress&cs=tinysrgb&w=600',
        audioUrl: item.file_url,
        file_url: item.file_url,
        category: (item.category as TrackCategory) || 'podcast',
        duration: item.duration || 180,
        lyrics: item.lyrics || item.description,
      }));

      // 2. Combinar con catálogo estático (siempre que estemos en la primera página o en 'all')
      let allAvailableTracks = [...formattedDynamicTracks];
      if (pageIndex === 0 && (categoryFilter === 'all' || categoryFilter === 'music')) {
        allAvailableTracks = [...allAvailableTracks, ...staticTracks];
      }

      // 3. Filtrar según la pestaña activa
      if (categoryFilter === 'all') {
        setTracks(allAvailableTracks);
      } else if (categoryFilter === 'albums') {
        setTracks([]);
      } else {
        const normalizedFilter = categoryFilter.toLowerCase().trim();
        const filtered = allAvailableTracks.filter((t) => {
          const cat = (t.category || '').toLowerCase().trim();
          if (normalizedFilter === 'podcast' || normalizedFilter === 'podcasts') {
            return cat === 'podcast' || cat === 'podcasts' || cat === 'audio';
          }
          if (normalizedFilter === 'blog' || normalizedFilter === 'lecturas') {
            return cat === 'blog' || cat === 'lectura' || cat === 'lecturas';
          }
          return cat === normalizedFilter;
        });
        setTracks(filtered);
      }

      setHasMoreTracks((dynamicContent || []).length === PAGE_SIZE);

      // 4. Obtener álbumes y podcasts contenedores con paginación separada
      const { data: albumsData, error: albumsError } = await supabase
        .from('playlists_albums')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (!albumsError && albumsData) {
        setAlbums(albumsData);
        setHasMoreAlbums(albumsData.length === PAGE_SIZE);
      }

      setPage(pageIndex);
    } catch (err) {
      console.error('Error cargando catálogo:', err);
    } finally {
      setLoading(false);
    }
  };

  const openPlayer = (track: Track, trackList: Track[]) => {
    if (audio.currentTrack?.id !== track.id) {
      audio.playTrack(track, trackList, { type: 'catalog', title: 'Catálogo' });
    }
    audio.openFullScreen();
  };

  const categories = [
    { id: 'all', label: 'Todo', icon: Sparkles },
    { id: 'music', label: 'Música', icon: Music },
    { id: 'podcast', label: 'Podcasts', icon: Mic },
    { id: 'albums', label: 'Álbumes', icon: Layers },
    { id: 'lecturas', label: 'Lecturas', icon: BookOpen },
    { id: 'video', label: 'Videos', icon: Video },
    { id: 'shorts', label: 'Shorts', icon: Flame },
  ];

  // Si el usuario hace clic en un álbum, se renderiza la vista de detalle estilo Spotify
  if (selectedAlbumId) {
    return (
      <AlbumDetailView
        albumId={selectedAlbumId}
        onBack={() => setSelectedAlbumId(null)}
        onOpenPlaylistModal={onOpenPlaylistModal || (() => {})}
      />
    );
  }

  return (
    <div className="w-full space-y-6 pb-28 animate-in fade-in duration-200">
      {/* Barra superior de pestañas/filtros */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-zinc-800/80">
        {categories.map(({ id, label, icon: Icon }) => {
          const isSelected = activeCategory === id;
          return (
            <button
              key={id}
              onClick={() => {
                setPage(0);
                setActiveCategory(id);
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-[#3CC8F5] text-black shadow-lg shadow-[#3CC8F5]/20'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Sección de Álbumes y Podcasts (Visible en "Todo" o "Álbumes") */}
      {(activeCategory === 'all' || activeCategory === 'albums') && albums.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Álbumes y Podcasts Destacados
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {albums.map((album) => (
              <div
                key={album.id}
                onClick={() => setSelectedAlbumId(album.id)}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800 bg-[#121214] p-3 cursor-pointer transition-all duration-300 hover:border-[#3CC8F5]/50 hover:bg-zinc-900"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-800 mb-3">
                  <img
                    src={
                      album.artwork_url ||
                      'https://images.pexels.com/photos/426976/pexels-photo-426976.jpeg?auto=compress&cs=tinysrgb&w=600'
                    }
                    alt={album.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-2 left-2 z-10 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-bold text-[#3CC8F5] backdrop-blur-sm uppercase">
                    {album.type || 'Álbum'}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white truncate group-hover:text-[#3CC8F5] transition-colors">
                    {album.title}
                  </h4>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    {album.author || 'Sanctify'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Encabezado contextual */}
      {activeCategory !== 'albums' && (
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            MOSTRANDO CATEGORÍA:{' '}
            <span className="text-[#3CC8F5]">{activeCategory.toUpperCase()}</span> ({tracks.length})
          </h2>
        </div>
      )}

      {/* Renderizado principal de pistas */}
      {loading ? (
        <div className="py-20 text-center text-xs text-zinc-500">Cargando catálogo...</div>
      ) : activeCategory === 'albums' ? (
        null
      ) : tracks.length === 0 ? (
        <div className="py-20 text-center text-zinc-500 space-y-3">
          <Mic className="mx-auto h-12 w-12 text-zinc-700" />
          <p className="text-sm font-semibold">No se encontraron audios en esta categoría.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
            {tracks.map((track) => {
              const isActive = audio?.currentTrack?.id === track.id;
              const isPlaying = isActive && audio?.isPlaying;

              return (
                <div
                  key={track.id}
                  onClick={() => openPlayer(track, tracks)}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-3 cursor-pointer transition-all duration-300 ${
                    isActive
                      ? 'border-[#3CC8F5] bg-[#3CC8F5]/15 animate-border-glow z-10'
                      : 'border-zinc-800 bg-[#121214] hover:border-zinc-700 hover:bg-zinc-900/60'
                  }`}
                >
                  {/* Indicador visual flotante de Pista Activa con Sparkles */}
                  {isActive && (
                    <div className="absolute top-2 left-2 z-20 flex items-center gap-1 rounded-full bg-[#3CC8F5] px-2 py-0.5 text-[9px] font-extrabold text-black shadow-lg animate-pulse">
                      <Sparkles className="h-3 w-3 animate-spin" /> Activa
                    </div>
                  )}

                  {/* Imagen con proporción cuadrada fija */}
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-800 mb-3">
                    <img
                      src={
                        track.artworkUrl ||
                        'https://images.pexels.com/photos/426976/pexels-photo-426976.jpeg?auto=compress&cs=tinysrgb&w=600'
                      }
                      alt={track.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Botón de reproducción flotante */}
                    <div className="absolute bottom-2 right-2 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isActive) {
                            audio?.togglePlayPause();
                          } else {
                            audio?.playTrack(track, tracks, { type: 'catalog', title: 'Catálogo' });
                          }
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3CC8F5] text-black shadow-md cursor-pointer hover:scale-105 transition-transform"
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4 fill-black" />
                        ) : (
                          <Play className="h-4 w-4 fill-black ml-0.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Textos controlados con truncado */}
                  <div className="flex flex-col flex-1 justify-between min-h-[55px]">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#3CC8F5]">
                        {track.category || 'Podcast'}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-tight mt-0.5 group-hover:text-[#3CC8F5] transition-colors">
                        {track.title}
                      </h4>
                    </div>
                    <p className="text-[10px] text-zinc-400 truncate mt-1">
                      {track.artist || 'Comunidad Orante'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Controles de Paginación */}
          <div className="flex items-center justify-between pt-6 border-t border-zinc-800/80">
            <button
              onClick={() => fetchCatalogData(page - 1, activeCategory)}
              disabled={page === 0 || loading}
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-40 cursor-pointer transition-all"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
            <span className="text-xs text-zinc-400 font-medium">Página {page + 1}</span>
            <button
              onClick={() => fetchCatalogData(page + 1, activeCategory)}
              disabled={(!hasMoreTracks && !hasMoreAlbums) || loading}
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-40 cursor-pointer transition-all"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}