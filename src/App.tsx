import { useState, useEffect, useMemo, useRef, type ChangeEvent, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  PlaySquare,
  Video,
  Heart,
  HeartHandshake,
  ChevronRight,
  Music,
  Mic,
  BookOpen,
  TrendingUp,
  Clock,
  Sparkles,
  Star,
  Library,
  Play,
  Pause,
  Disc,
  X,
  ArrowLeft,
  ChevronDown,
  Pencil,
  Settings,
  LogOut,
  Bell,
  Palette,
  User,
  ArrowUp,
  ArrowDown,
  CalendarArrowDown,
  CalendarArrowUp,
  ListOrdered,
} from 'lucide-react';
import { AudioProvider, useAudio } from '@/context/AudioContext';
import { ReminderProvider } from '@/context/ReminderContext';
import { useTheme } from '@/hooks/useTheme';
import type { Track, TrackCategory } from '@/types/audio';
import MiniPlayer from '@/components/MiniPlayer';
import FullScreenPlayer from '@/components/FullScreenPlayer';
import ShortsScreen from '@/components/ShortsScreen';
import VideoDetailScreen from '@/components/VideoDetailScreen';
import PayItForwardScreen from '@/components/PayItForwardScreen';
import LandingPage from '@/components/LandingPage';
import CreatorStudio from '@/components/CreatorStudio';
import AddToPlaylistModal from '@/components/AddToPlaylistModal';
import LibraryScreen from '@/components/LibraryScreen';
import NotificationsPopover from '@/components/NotificationsPopover';
import CreatorOnboardingModal from '@/components/CreatorOnboardingModal';
import CreatorPendingScreen from '@/components/CreatorPendingScreen';
import LecturesView from '@/components/LecturesView';
import AdminReviewView from '@/components/creator/AdminReviewView';
import { SacredHeartIcon } from '@/components/SacredHeartIcon';
import { supabase } from './supabase';
import { AuthProvider } from '@/components/AuthContext';

type View =
  | 'catalog'
  | 'shorts'
  | 'video'
  | 'donate'
  | 'creator'
  | 'creator-pending'
  | 'library'
  | 'favorites'
  | 'library-music'
  | 'library-podcast'
  | 'library-blog'
  | 'library-video'
  | 'library-albums'
  | 'library-series'
  | 'lecturas'
  | 'admin-review';

type FilterOption = 'all' | 'music' | 'podcast' | 'blog' | 'videos' | 'shorts';
type CatalogSortMode = 'default' | 'alpha_asc' | 'alpha_desc' | 'date_desc' | 'date_asc';

const DEFAULT_ARTWORK =
  'https://images.pexels.com/photos/426976/pexels-photo-426976.jpeg?auto=compress&cs=tinysrgb&w=600';
const DEFAULT_AVATAR =
  'https://images.pexels.com/photos/426976/pexels-photo-426976.jpeg?auto=compress&cs=tinysrgb&w=150';

const categoryIcon: Record<TrackCategory, typeof Music> = {
  music: Music,
  podcast: Mic,
  blog: BookOpen,
  video: Video,
};

const filterButtons: { key: FilterOption; label: string; icon: typeof Music }[] = [
  { key: 'all', label: 'Todo', icon: Sparkles },
  { key: 'music', label: 'Música', icon: Music },
  { key: 'podcast', label: 'Podcasts', icon: Mic },
  { key: 'blog', label: 'Lecturas', icon: BookOpen },
  { key: 'videos', label: 'Videos', icon: Video },
  { key: 'shorts', label: 'Shorts', icon: PlaySquare },
];

const sortButtons: {
  id: CatalogSortMode;
  label?: string;
  title: string;
  icon: typeof ListOrdered;
}[] = [
  { id: 'default', label: 'Orden', title: 'Orden por defecto', icon: ListOrdered },
  { id: 'alpha_asc', label: 'A–Z', title: 'Ordenar de la A a la Z', icon: ArrowUp },
  { id: 'alpha_desc', label: 'Z–A', title: 'Ordenar de la Z a la A', icon: ArrowDown },
  { id: 'date_desc', title: 'Fecha: Mayor a menor', icon: CalendarArrowDown },
  { id: 'date_asc', title: 'Fecha: Menor a mayor', icon: CalendarArrowUp },
];

function getTrackTimestamp(track: any): number | null {
  const raw = track.created_at || track.date || track.published_at;
  if (raw) {
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

function sortCatalogTracks(list: Track[], mode: CatalogSortMode): Track[] {
  if (mode === 'default') return list;

  if (mode === 'alpha_asc') {
    return [...list].sort((a, b) =>
      (a.title || '').localeCompare(b.title || '', 'es', { sensitivity: 'base', numeric: true })
    );
  }

  if (mode === 'alpha_desc') {
    return [...list].sort((a, b) =>
      (b.title || '').localeCompare(a.title || '', 'es', { sensitivity: 'base', numeric: true })
    );
  }

  const dir = mode === 'date_desc' ? -1 : 1;
  return [...list].sort((a, b) => {
    const tsA = getTrackTimestamp(a);
    const tsB = getTrackTimestamp(b);
    if (tsA !== null && tsB !== null && tsA !== tsB) {
      return (tsA - tsB) * dir;
    }
    if (tsA !== null && tsB === null) return -1;
    if (tsA === null && tsB !== null) return 1;
    return (a.title || '').localeCompare(b.title || '', 'es', {
      sensitivity: 'base',
      numeric: true,
    });
  });
}

const getCategoryBgImage = (category: string) => {
  switch ((category || '').toLowerCase().trim()) {
    case 'favorites':
      return 'https://images.pexels.com/photos/1047442/pexels-photo-1047442.jpeg?auto=compress&cs=tinysrgb&w=600';
    case 'music':
    case 'música':
      return 'https://images.pexels.com/photos/1762578/pexels-photo-1762578.jpeg?auto=compress&cs=tinysrgb&w=600';
    case 'podcast':
    case 'podcasts':
      return 'https://images.pexels.com/photos/6953870/pexels-photo-6953870.jpeg?auto=compress&cs=tinysrgb&w=600';
    case 'blog':
    case 'lectura':
    case 'lecturas':
      return 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=600';
    case 'video':
    case 'videos':
      return 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=600';
    default:
      return DEFAULT_ARTWORK;
  }
};

interface CarouselSectionProps {
  title: string;
  subtitle: string;
  icon: typeof TrendingUp;
  items: Track[];
  onOpenPlaylistModal: (track: Track) => void;
  onViewAll?: () => void;
  onSelectTrack: (track: Track, queue: Track[]) => void;
}

function CarouselSection({
  title,
  subtitle,
  icon: Icon,
  items,
  onViewAll,
  onSelectTrack,
}: CarouselSectionProps) {
  const { currentTrack, isPlaying, togglePlayPause, favorites, toggleFavorite } = useAudio();

  if (items.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[#3CC8F5]" />
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white sm:text-base">{title}</h2>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{subtitle}</p>
          </div>
        </div>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="flex items-center gap-1 text-xs font-semibold text-[#3CC8F5] transition-opacity hover:opacity-80 cursor-pointer"
          >
            Ver todo <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      <div
        className="flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide sm:px-6"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((track) => {
          const isActive = currentTrack?.id === track.id;
          const isFavorite = favorites.has(track.id);
          const CatIcon = categoryIcon[track.category] || Music;
          const bgImage = getCategoryBgImage(track.category);

          return (
            <div
              key={track.id}
              onClick={() => (isActive ? togglePlayPause() : onSelectTrack(track, items))}
              className={`group relative flex w-36 shrink-0 flex-col rounded-2xl border text-left transition-all duration-300 hover:-translate-y-1 sm:w-44 bg-zinc-900/20 dark:bg-zinc-950/20 backdrop-blur-md cursor-pointer overflow-hidden ${
                isActive
                  ? 'border-[#3CC8F5] bg-[#3CC8F5]/10 shadow-[0_0_20px_rgba(60,200,245,0.4)]'
                  : 'border-zinc-200/30 dark:border-zinc-800/30 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-lg'
              }`}
              style={{
                backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.55)), url(${bgImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {isActive && (
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-[#3CC8F5] px-2 py-0.5 text-[9px] font-extrabold text-black shadow-lg">
                  <Sparkles className="h-3 w-3 animate-spin" /> Activa
                </div>
              )}

              <div className="relative aspect-square overflow-hidden w-full text-left rounded-t-2xl">
                <img
                  src={track.artworkUrl || DEFAULT_ARTWORK}
                  alt={track.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div
                  className={`absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full shadow-lg transition-all duration-200 ${
                    isActive
                      ? 'scale-100 bg-[#3CC8F5]'
                      : 'translate-y-2 bg-white/90 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'
                  }`}
                >
                  {isActive && isPlaying ? (
                    <span className="flex gap-0.5 items-end h-4">
                      <span className="w-0.5 bg-black animate-eq-bar h-3" />
                      <span
                        className="w-0.5 bg-black animate-eq-bar h-4"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="w-0.5 bg-black animate-eq-bar h-2"
                        style={{ animationDelay: '300ms' }}
                      />
                    </span>
                  ) : (
                    <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4 text-black" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(track.id);
                }}
                className="absolute top-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all hover:bg-black cursor-pointer shadow-md z-10"
                title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              >
                <SacredHeartIcon
                  className={`h-7 w-7 transition-transform ${
                    isFavorite ? 'scale-105 text-[#EF4444]' : 'text-white hover:text-[#3CC8F5]'
                  }`}
                  filled={isFavorite}
                />
              </button>

              <div className="p-3 bg-black/30 backdrop-blur-[2px]">
                <div className="mb-1.5 flex items-center gap-1">
                  <CatIcon className="h-3 w-3 text-zinc-300" />
                  <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-300">
                    {track.category}
                  </span>
                </div>
                <p className="truncate text-xs font-semibold text-white">{track.title}</p>
                <p className="truncate text-[11px] text-zinc-300">{track.artist}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface UserMenuProps {
  session: any;
  onLogout: () => void;
  onOpenSettings: () => void;
}

function UserMenu({ session, onLogout, onOpenSettings }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name || session.user.email?.split('@')[0] || '');
          setAvatarUrl(data.avatar_url || session.user.user_metadata?.avatar_url || '');
        } else {
          setFullName(session.user.email?.split('@')[0] || '');
        }
      });
  }, [session]);

  const userDisplayName = fullName || session?.user?.email?.split('@')[0] || 'Usuario';
  const currentAvatar = avatarUrl || DEFAULT_AVATAR;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-xl bg-zinc-900/60 dark:bg-zinc-800/70 px-2.5 py-1.5 border border-zinc-700/60 hover:border-[#3CC8F5] transition-all cursor-pointer shadow-sm whitespace-nowrap"
      >
        <img
          src={currentAvatar}
          alt={userDisplayName}
          className="h-7 w-7 rounded-full object-cover border border-[#3CC8F5]/50 shrink-0"
        />
        <span className="hidden md:inline text-xs font-bold text-white truncate max-w-[110px]">
          {userDisplayName}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-zinc-800 bg-[#121214] py-2 shadow-2xl">
          <div className="px-4 py-2 border-b border-zinc-800/80 mb-1">
            <p className="text-[10px] text-zinc-400">Conectado como</p>
            <p className="text-xs font-bold text-white truncate">{session?.user?.email}</p>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onOpenSettings();
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white cursor-pointer"
          >
            <Settings className="h-4 w-4 text-[#3CC8F5]" />
            <span>Configuración y Perfil</span>
          </button>

          <div className="my-1 border-t border-zinc-800 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface CatalogProps {
  onOpenShorts: () => void;
  onOpenVideos: () => void;
  onOpenCreatorFlow: () => void;
  onOpenLectures: () => void;
  isAdmin: boolean;
  isApprovedCreator: boolean;
  setActiveView: (view: View) => void;
  session: any;
  onLogout: () => void;
  onOpenPlaylistModal: (track: Track) => void;
  tracks: Track[];
  catalogLoading: boolean;
  onSelectTrack: (track: Track, queue: Track[]) => void;
  isSearchModalOpen: boolean;
  setIsSearchModalOpen: (open: boolean) => void;
  onOpenSettings: () => void;
}

function CatalogSkeleton() {
  return (
    <div className="space-y-8 px-4 pb-32 pt-6 sm:px-6" aria-label="Cargando catálogo" aria-busy="true">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-900" />
        ))}
      </div>
      {Array.from({ length: 3 }, (_, sectionIndex) => (
        <section key={sectionIndex} className="space-y-3">
          <div className="h-5 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-900" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 items-start">
            {Array.from({ length: 5 }, (_, cardIndex) => (
              <div key={cardIndex} className="space-y-2">
                <div className="aspect-square animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-900" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-900" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-900" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Catalog({
  onOpenShorts,
  onOpenVideos,
  onOpenCreatorFlow,
  onOpenLectures,
  isAdmin,
  isApprovedCreator,
  setActiveView,
  session,
  onLogout,
  onOpenPlaylistModal,
  tracks,
  catalogLoading,
  onSelectTrack,
  isSearchModalOpen,
  setIsSearchModalOpen,
  onOpenSettings,
}: CatalogProps) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [sortMode, setSortMode] = useState<CatalogSortMode>('default');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);
  const catalogSearchRef = useRef<HTMLInputElement>(null);

  const { currentTrack, isPlaying, togglePlayPause, favorites, toggleFavorite } = useAudio();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !isSearchModalOpen) {
        e.preventDefault();
        catalogSearchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSearchModalOpen]);

  const music = useMemo(
    () => sortCatalogTracks(tracks.filter((t) => t.category === 'music'), sortMode),
    [tracks, sortMode]
  );
  const podcasts = useMemo(
    () =>
      sortCatalogTracks(
        tracks.filter(
          (t) =>
            t.category === 'podcast' ||
            (t.category as string) === 'podcasts' ||
            (t.category as string) === 'audio'
        ),
        sortMode
      ),
    [tracks, sortMode]
  );
  const readings = useMemo(
    () =>
      sortCatalogTracks(
        tracks.filter((t) => t.category === 'blog' || (t.category as string) === 'lecturas'),
        sortMode
      ),
    [tracks, sortMode]
  );

  const filteredTracks = useMemo(() => {
    const base =
      activeFilter === 'all'
        ? tracks
        : tracks.filter((t) => {
            const cat = (t.category || '').toLowerCase().trim();
            if (activeFilter === 'podcast') {
              return (
                cat === 'podcast' || cat === 'podcasts' || cat === 'audio' || cat === 'oracion'
              );
            }
            if (activeFilter === 'blog') {
              return cat === 'blog' || cat === 'lectura' || cat === 'lecturas';
            }
            return cat === activeFilter;
          });
    return sortCatalogTracks(base, sortMode);
  }, [activeFilter, tracks, sortMode]);

  const sortedSearchResults = useMemo(
    () => sortCatalogTracks(searchResults, sortMode),
    [searchResults, sortMode]
  );

  const continueListening = useMemo(
    () => sortCatalogTracks(tracks.slice(0, 4), sortMode),
    [tracks, sortMode]
  );
  const newest = useMemo(
    () => sortCatalogTracks([...tracks].reverse().slice(0, 5), sortMode),
    [tracks, sortMode]
  );
  const trending = useMemo(
    () =>
      sortCatalogTracks(
        [...tracks].sort((a, b) => String(a.id).localeCompare(String(b.id))).slice(0, 5),
        sortMode
      ),
    [tracks, sortMode]
  );
  const recommended = useMemo(
    () => sortCatalogTracks([...music, ...podcasts].slice(0, 5), sortMode),
    [music, podcasts, sortMode]
  );

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const { data, error } = await supabase
          .from('tracks')
          .select('*')
          .or(`artist.ilike.%${query}%,album.ilike.%${query}%,title.ilike.%${query}%`)
          .order('album', { ascending: true })
          .order('title', { ascending: true });

        if (!error && data && data.length > 0) {
          setSearchResults(data);
        } else {
          const qLower = query.toLowerCase();
          const localFiltered = tracks.filter(
            (t) =>
              t.title.toLowerCase().includes(qLower) ||
              t.artist.toLowerCase().includes(qLower) ||
              (t.category || '').toLowerCase().includes(qLower)
          );
          setSearchResults(localFiltered);
        }
      } catch (err) {
        console.error('Error en búsqueda avanzada:', err);
        const qLower = query.toLowerCase();
        const localFiltered = tracks.filter(
          (t) =>
            t.title.toLowerCase().includes(qLower) ||
            t.artist.toLowerCase().includes(qLower) ||
            (t.category || '').toLowerCase().includes(qLower)
        );
        setSearchResults(localFiltered);
      } finally {
        setSearching(false);
      }
    };

    const timer = setTimeout(fetchSearchResults, 300);
    return () => clearTimeout(timer);
  }, [query, tracks]);

  const handleFilterClick = (key: FilterOption) => {
    if (key === 'videos') {
      onOpenVideos();
      return;
    }
    if (key === 'shorts') {
      onOpenShorts();
      return;
    }
    if (key === 'blog') {
      onOpenLectures();
      return;
    }
    setActiveFilter(key);
  };

  const renderTrackCard = (track: Track, queue: Track[]) => {
    const isActive = currentTrack?.id === track.id;
    const isFavorite = favorites.has(track.id);
    const isPlayingState = isActive && isPlaying;
    const bgImage = getCategoryBgImage(track.category);

    return (
      <div
        key={track.id}
        onClick={() => (isActive ? togglePlayPause() : onSelectTrack(track, queue))}
        className={`group relative flex flex-col justify-between rounded-2xl border p-3 cursor-pointer transition-all duration-300 w-full overflow-hidden bg-zinc-900/20 backdrop-blur-md ${
          isActive
            ? 'border-[#3CC8F5] bg-[#3CC8F5]/10 shadow-[0_0_20px_rgba(60,200,245,0.4)]'
            : 'border-zinc-200/30 dark:border-zinc-800/30 hover:border-zinc-700'
        }`}
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.55)), url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {isActive && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-[#3CC8F5] px-2 py-0.5 text-[9px] font-extrabold text-black shadow-lg">
            <Sparkles className="h-3 w-3 animate-spin" /> Activa
          </div>
        )}

        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-800 mb-3">
          <img
            src={track.artworkUrl || DEFAULT_ARTWORK}
            alt={track.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute bottom-2 right-2 z-10">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isActive) {
                  togglePlayPause();
                } else {
                  onSelectTrack(track, queue);
                }
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3CC8F5] text-black shadow-md cursor-pointer hover:scale-105 transition-transform"
            >
              {isPlayingState ? (
                <Pause className="h-4 w-4 fill-black" />
              ) : (
                <Play className="h-4 w-4 fill-black ml-0.5" />
              )}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(track.id);
          }}
          className="absolute top-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all hover:bg-black cursor-pointer shadow-md z-10"
        >
          <SacredHeartIcon
            className={`h-7 w-7 transition-transform ${
              isFavorite ? 'scale-105 text-[#EF4444]' : 'text-white'
            }`}
            filled={isFavorite}
          />
        </button>

        <div className="flex flex-col flex-1 justify-between min-h-[55px] p-2 rounded-xl bg-black/30 backdrop-blur-[2px]">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#3CC8F5]">
              {track.category || 'Podcast'}
            </span>
            <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-tight mt-0.5 group-hover:text-[#3CC8F5] transition-colors">
              {track.title}
            </h4>
          </div>
          <p className="text-[10px] text-zinc-300 truncate mt-1">
            {track.artist || 'Comunidad Orante'}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-white dark:bg-[#0A0A0B] pb-36 text-zinc-900 dark:text-white transition-colors duration-200">
      <header className="fixed top-0 left-0 right-0 z-20 border-b border-zinc-200 dark:border-zinc-800/80 bg-white/95 dark:bg-[#0A0A0B]/95 backdrop-blur-xl shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-6">
          <div
            onClick={() => {
              setActiveView('catalog');
              setQuery('');
              setActiveFilter('all');
              setSortMode('default');
            }}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer transition-transform hover:scale-[1.02] shrink-0"
            title="Ir al inicio"
          >
            <img
              src="/Sanctify_Icon_white.png"
              alt="Sanctify"
              className="h-14 w-14 sm:h-11 sm:w-11 rounded-xl object-cover dark:hidden shrink-0"
            />
            <img
              src="/Sanctify_Icon_black.png"
              alt="Sanctify"
              className="hidden h-14 w-14 sm:h-11 sm:w-11 rounded-xl object-cover dark:block shrink-0"
            />
            <span className="text-lg sm:text-xl font-black tracking-wider text-zinc-900 dark:text-white truncate">
              Sanctify
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isApprovedCreator && (
              <button
                type="button"
                onClick={onOpenCreatorFlow}
                className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#3CC8F5]/40 px-2.5 sm:px-3 text-xs font-bold text-[#3CC8F5] transition-all hover:bg-[#3CC8F5] hover:text-black shrink-0 cursor-pointer"
                title="Crear"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Crear</span>
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveView('admin-review')}
                className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 sm:px-3 text-xs font-bold text-amber-400 transition-all hover:bg-amber-500 hover:text-black shrink-0 cursor-pointer"
                title="Panel Admin"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            <div className="shrink-0 flex items-center justify-center">
              <NotificationsPopover session={session} />
            </div>

            <div className="shrink-0 flex items-center justify-center">
              <UserMenu
                session={session}
                onLogout={onLogout}
                onOpenSettings={onOpenSettings}
              />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-3 pb-2.5 sm:px-6">
          <div className="flex flex-col gap-2">
            {/* Buscador UI/UX con lupa integrada */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                ref={catalogSearchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar en el catálogo por título, creador o categoría..."
                aria-label="Buscar en el catálogo"
                className="w-full rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100/90 dark:bg-zinc-900/90 pl-10 pr-9 py-1.5 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-500 outline-none focus:border-[#3CC8F5] transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filtros de categoría */}
            <div
              className="flex gap-2 overflow-x-auto scrollbar-hide"
              style={{ scrollbarWidth: 'none' }}
            >
              {filterButtons.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleFilterClick(key)}
                  className={`flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === key
                      ? 'bg-[#3CC8F5] text-black'
                      : 'border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {label}
                </button>
              ))}
            </div>

            {/* Controles rápidos de ordenamiento (fecha compacta sin texto) */}
            <div
              className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pt-0.5"
              style={{ scrollbarWidth: 'none' }}
            >
              {sortButtons.map(({ id, label, title, icon: Icon }) => {
                const isSelected = sortMode === id;
                const isIconOnly = !label;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSortMode(id)}
                    title={title}
                    aria-label={title}
                    className={`inline-flex shrink-0 items-center justify-center rounded-full transition-all cursor-pointer ${
                      isIconOnly
                        ? 'h-7 w-7 p-0'
                        : 'gap-1 whitespace-nowrap px-2.5 py-1 text-[11px] font-bold'
                    } ${
                      isSelected
                        ? 'bg-[#3CC8F5]/20 text-[#3CC8F5] border border-[#3CC8F5]'
                        : 'border border-zinc-200 dark:border-zinc-800/80 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {label && <span>{label}</span>}
                  </button>
                );
              })}
            </div>

            {activeFilter === 'music' && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveView('library-albums')}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-pink-500/10 border border-pink-500/30 px-3 py-1.5 text-xs font-bold text-pink-400 hover:bg-pink-500/20 cursor-pointer"
                >
                  <Disc className="h-3.5 w-3.5" /> Artistas / Álbumes
                </button>
              </div>
            )}

            {activeFilter === 'podcast' && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveView('library-series')}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20 cursor-pointer"
                >
                  <Mic className="h-3.5 w-3.5" /> Series / Programas
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl border border-zinc-800 bg-[#121214] p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col my-auto">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSearchModalOpen(false)}
                  className="rounded-full bg-zinc-800 p-2 text-zinc-300 hover:text-white cursor-pointer"
                  title="Regresar"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Search className="h-5 w-5 text-[#3CC8F5]" /> Buscar en Sanctify
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSearchModalOpen(false);
                  setQuery('');
                }}
                className="rounded-full bg-zinc-800 p-2 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por artista, álbum o canción..."
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-[#3CC8F5]"
                autoFocus
              />
            </div>

            {query.trim() && (
              <div className="overflow-y-auto space-y-3 pt-2 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {searching
                      ? 'Buscando...'
                      : `${sortedSearchResults.length} resultado${
                          sortedSearchResults.length !== 1 ? 's' : ''
                        }`}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setIsSearchModalOpen(false);
                    }}
                    className="text-xs text-[#3CC8F5] underline hover:opacity-80 cursor-pointer"
                  >
                    Regresar al catálogo
                  </button>
                </div>
                {sortedSearchResults.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sortedSearchResults.map((track) => (
                      <div
                        key={track.id}
                        onClick={() => {
                          onSelectTrack(track, sortedSearchResults);
                          setIsSearchModalOpen(false);
                        }}
                        className="flex items-center gap-3 p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 cursor-pointer border border-zinc-800 transition-all"
                      >
                        <img
                          src={track.artworkUrl || DEFAULT_ARTWORK}
                          alt={track.title}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">{track.title}</p>
                          <p className="text-[10px] text-zinc-400 truncate">{track.artist}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-xs text-zinc-500 py-6">
                    No se encontraron resultados.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pt-[204px] sm:pt-[196px]">
        {catalogLoading ? (
          <CatalogSkeleton />
        ) : query.trim() ? (
          <div className="px-4 pb-8 pt-5 sm:px-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {searching
                  ? 'Buscando...'
                  : `${sortedSearchResults.length} resultado${
                      sortedSearchResults.length !== 1 ? 's' : ''
                    } para "${query}"`}
              </p>
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-xs text-[#3CC8F5] underline hover:opacity-80 cursor-pointer"
              >
                Limpiar búsqueda y regresar al Home
              </button>
            </div>
            {sortedSearchResults.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
                {sortedSearchResults.map((track) => renderTrackCard(track, sortedSearchResults))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-20">
                <p className="text-sm text-zinc-500">Sin resultados para tu búsqueda.</p>
              </div>
            )}
          </div>
        ) : activeFilter !== 'all' ? (
          <div className="px-4 pb-8 pt-5 sm:px-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                MOSTRANDO CATEGORÍA:{' '}
                <strong className="text-[#3CC8F5]">{activeFilter.toUpperCase()}</strong> (
                {filteredTracks.length})
              </span>
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className="text-xs text-[#3CC8F5] underline hover:opacity-80 cursor-pointer"
              >
                Ver todo el catálogo
              </button>
            </div>
            {filteredTracks.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 items-start w-full">
                {filteredTracks.map((track) => renderTrackCard(track, filteredTracks))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-20">
                <p className="text-sm text-zinc-500">No hay contenido en esta categoría todavía.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="pt-1">
            <div className="mb-4 px-4 sm:px-6">
              <div className="relative overflow-hidden rounded-2xl border border-[#3CC8F5]/20 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-[#121214] dark:to-[#0A0A0B] py-3 px-4 text-center">
                <div className="relative z-10 space-y-1">
                  <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-[#3CC8F5]">
                    BIENVENIDO A SANCTIFY
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 font-medium">
                    Contenido espiritual católico <br className="hidden sm:inline" />
                    100% gratuito y sin anuncios
                  </p>
                </div>
              </div>
            </div>

            <section className="mb-6 px-4 sm:px-6">
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-[#3CC8F5]" />
                  <div>
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-white sm:text-base">
                      Tus Listas y Favoritos
                    </h2>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Acceso rápido a tu música y reflexiones guardadas
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <div
                  onClick={() => setActiveView('favorites')}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200/30 dark:border-zinc-800/30 bg-zinc-900/20 backdrop-blur-md p-3.5 cursor-pointer transition-all hover:border-[#3CC8F5]"
                  style={{
                    backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6)), url(${getCategoryBgImage(
                      'favorites'
                    )})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
                      <SacredHeartIcon className="h-8 w-8 text-rose-400" filled={true} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#3CC8F5] transition-colors">
                      Mis Favoritos
                    </h3>
                    <p className="text-[10px] text-zinc-300 mt-0.5">Tus pistas guardadas</p>
                  </div>
                </div>

                <div
                  onClick={() => setActiveView('library-music')}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200/30 dark:border-zinc-800/30 bg-zinc-900/20 backdrop-blur-md p-3.5 cursor-pointer transition-all hover:border-[#3CC8F5]"
                  style={{
                    backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6)), url(${getCategoryBgImage(
                      'music'
                    )})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                      <Music className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#3CC8F5] transition-colors">
                      Mi Música
                    </h3>
                    <p className="text-[10px] text-zinc-300 mt-0.5">Tus listas de música</p>
                  </div>
                </div>

                <div
                  onClick={() => setActiveView('library-podcast')}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200/30 dark:border-zinc-800/30 bg-zinc-900/20 backdrop-blur-md p-3.5 cursor-pointer transition-all hover:border-[#3CC8F5]"
                  style={{
                    backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6)), url(${getCategoryBgImage(
                      'podcast'
                    )})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                      <Mic className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#3CC8F5] transition-colors">
                      Mis Podcasts
                    </h3>
                    <p className="text-[10px] text-zinc-300 mt-0.5">Reflexiones</p>
                  </div>
                </div>

                <div
                  onClick={() => setActiveView('library-blog')}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200/30 dark:border-zinc-800/30 bg-zinc-900/20 backdrop-blur-md p-3.5 cursor-pointer transition-all hover:border-[#3CC8F5]"
                  style={{
                    backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6)), url(${getCategoryBgImage(
                      'blog'
                    )})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                      <BookOpen className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#3CC8F5] transition-colors">
                      Mis Lecturas
                    </h3>
                    <p className="text-[10px] text-zinc-300 mt-0.5">Meditaciones diarias</p>
                  </div>
                </div>

                <div
                  onClick={() => setActiveView('library-video')}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200/30 dark:border-zinc-800/30 bg-zinc-900/20 backdrop-blur-md p-3.5 cursor-pointer transition-all hover:border-[#3CC8F5]"
                  style={{
                    backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6)), url(${getCategoryBgImage(
                      'video'
                    )})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
                      <Video className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#3CC8F5] transition-colors">
                      Mis Videos
                    </h3>
                    <p className="text-[10px] text-zinc-300 mt-0.5">Audiovisual</p>
                  </div>
                </div>

                <div
                  onClick={() => setActiveView('library-albums')}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200/30 dark:border-zinc-800/30 bg-zinc-900/20 backdrop-blur-md p-3.5 cursor-pointer transition-all hover:border-pink-500"
                  style={{
                    backgroundImage:
                      'linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6)), url(https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=600)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-500/20 text-pink-500">
                      <Disc className="h-4 w-4 text-pink-500" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-pink-400 transition-colors">
                      Álbumes
                    </h3>
                    <p className="text-[10px] text-zinc-300 mt-0.5">Discografía</p>
                  </div>
                </div>
              </div>
            </section>

            <CarouselSection
              title="Continuar leyendo"
              subtitle="Retoma donde lo dejaste"
              icon={Clock}
              items={continueListening}
              onOpenPlaylistModal={onOpenPlaylistModal}
              onViewAll={() => setActiveFilter('blog')}
              onSelectTrack={onSelectTrack}
            />
            <CarouselSection
              title="Novedades"
              subtitle="Recién añadido a Sanctify"
              icon={Sparkles}
              items={newest}
              onOpenPlaylistModal={onOpenPlaylistModal}
              onViewAll={() => setActiveFilter('music')}
              onSelectTrack={onSelectTrack}
            />
            <CarouselSection
              title="Tendencias de la comunidad"
              subtitle="Lo más escuchado esta semana"
              icon={TrendingUp}
              items={trending}
              onOpenPlaylistModal={onOpenPlaylistModal}
              onViewAll={() => setActiveFilter('podcast')}
              onSelectTrack={onSelectTrack}
            />
            <CarouselSection
              title="Recomendados"
              subtitle="Selección personalizada para ti"
              icon={Star}
              items={recommended}
              onOpenPlaylistModal={onOpenPlaylistModal}
              onViewAll={() => setActiveFilter('all')}
              onSelectTrack={onSelectTrack}
            />

            <section className="mb-8 px-4 sm:px-6">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-[#3CC8F5]" />
                  <div>
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-white sm:text-base">
                      Podcasts
                    </h2>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Reflexiones y enseñanzas
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveFilter('podcast')}
                  className="flex items-center gap-1 text-xs font-semibold text-[#3CC8F5] transition-opacity hover:opacity-80 cursor-pointer"
                >
                  Ver todo <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 items-start w-full">
                {podcasts.map((track) => renderTrackCard(track, podcasts))}
              </div>
            </section>

            <section className="px-4 pb-4 sm:px-6">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#3CC8F5]" />
                  <div>
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-white sm:text-base">
                      Lecturas
                    </h2>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Meditaciones y Lectio Divina
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveFilter('blog')}
                  className="flex items-center gap-1 text-xs font-semibold text-[#3CC8F5] transition-opacity hover:opacity-80 cursor-pointer"
                >
                  Ver todo <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 items-start w-full">
                {readings.map((track) => renderTrackCard(track, readings))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function AppLayout({
  catalogLoading,
  session,
  onLogout,
}: {
  catalogLoading: boolean;
  session: any;
  onLogout: () => void;
}) {
  const [activeView, setActiveView] = useState<View>('catalog');
  const [playlistTrack, setPlaylistTrack] = useState<Track | null>(null);
  const [directLecture, setDirectLecture] = useState<any | null>(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState<
    'profile' | 'settings' | 'notifications' | 'theme'
  >('profile');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [fullName, setFullName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(true);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isApprovedCreator, setIsApprovedCreator] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const { queue, playTrack, isFullScreenOpen, closeFullScreen } = useAudio();

  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name || session.user.email?.split('@')[0] || '');
          setAvatarUrl(data.avatar_url || session.user.user_metadata?.avatar_url || '');
        } else {
          setFullName(session.user.email?.split('@')[0] || '');
        }
      });
  }, [session]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    try {
      const files = e.target.files;
      if (!files || files.length === 0 || !session?.user?.id) return;
      setUploading(true);

      const selectedFile = files[0];
      const fileExt = selectedFile.name.split('.').pop() || 'png';
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
    } catch (err: any) {
      console.error('Error subiendo imagen:', err);
      alert(
        'Error al subir la imagen. Asegúrate de tener configurado el bucket "avatars" en Supabase.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;

    try {
      setSaving(true);
      const { error } = await supabase.from('profiles').upsert({
        id: session.user.id,
        full_name: fullName.trim(),
        avatar_url: avatarUrl.trim(),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      setShowSettingsModal(false);
    } catch (err) {
      console.error('Error guardando perfil:', err);
      alert('Error al guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  const changeThemeMode = (dark: boolean) => {
    setIsDarkTheme(dark);
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  };

  const currentAvatar = avatarUrl || DEFAULT_AVATAR;

  useEffect(() => {
    const handleOpenPlaylistModal = (e: CustomEvent<Track>) => {
      if (e.detail) {
        setPlaylistTrack(e.detail);
      }
    };

    const handleOpenLecturasView = (e: CustomEvent<any>) => {
      if (e.detail) {
        setDirectLecture(e.detail);
      } else {
        setActiveView('lecturas');
      }
    };

    window.addEventListener('open-playlist-modal' as any, handleOpenPlaylistModal);
    window.addEventListener('open-lecturas-view' as any, handleOpenLecturasView);

    return () => {
      window.removeEventListener('open-playlist-modal' as any, handleOpenPlaylistModal);
      window.removeEventListener('open-lecturas-view' as any, handleOpenLecturasView);
    };
  }, []);

  const handleSelectTrack = (track: any, queue: Track[]) => {
    const fileUrl = (
      track.file_url ||
      track.audioUrl ||
      track.audio_url ||
      track.url ||
      ''
    ).toLowerCase();
    const category = (track.category || '').toLowerCase();
    const title = (track.title || '').toLowerCase();

    const isPdf =
      fileUrl.includes('.pdf') ||
      category === 'blog' ||
      category === 'reading' ||
      category === 'lecturas' ||
      title.includes('.pdf');

    if (isPdf) {
      setDirectLecture(track);
      return;
    }

    playTrack(track, queue);
  };

  useEffect(() => {
    async function checkAdminStatus() {
      if (!session?.user?.id) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (!error && data) {
          setIsAdmin(data.role === 'admin');
        }
      } catch (err) {
        console.error('Error al consultar permisos:', err);
      }
    }
    void checkAdminStatus();
  }, [session]);

  useEffect(() => {
    if (!session?.user?.id) {
      setIsApprovedCreator(false);
      return;
    }
    supabase
      .from('creator_profiles')
      .select('status')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.warn('No se pudo consultar el estado de creador:', error);
        setIsApprovedCreator(data?.status === 'approved');
      });
  }, [session]);

  const handleOpenCreatorFlow = async () => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from('creator_profiles')
        .select('status')
        .eq('id', session.user.id)
        .single();

      if (error || !data) {
        setShowOnboardingModal(true);
      } else if (data.status === 'pending') {
        setActiveView('creator-pending');
      } else if (data.status === 'approved') {
        setActiveView('creator');
      } else {
        setShowOnboardingModal(true);
      }
    } catch {
      setShowOnboardingModal(true);
    }
  };

  const getLibraryCategory = () => {
    switch (activeView) {
      case 'favorites':
        return 'favorites';
      case 'library-music':
        return 'music';
      case 'library-podcast':
        return 'podcast';
      case 'library-blog':
        return 'blog';
      case 'library-video':
        return 'video';
      case 'library-albums':
        return 'albums';
      case 'library-series':
        return 'series';
      default:
        return 'favorites';
    }
  };

  return (
    <div className="flex min-h-screen max-w-full overflow-x-hidden flex-col bg-white dark:bg-[#0A0A0B] transition-colors duration-200">
      <main className="flex-1 max-w-full overflow-x-hidden pb-36">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="min-h-full"
          >
            {activeView === 'catalog' ? (
              <Catalog
                session={session}
                onLogout={onLogout}
                isAdmin={isAdmin}
                isApprovedCreator={isApprovedCreator}
                setActiveView={setActiveView}
                onOpenShorts={() => setActiveView('shorts')}
                onOpenVideos={() => setActiveView('video')}
                onOpenCreatorFlow={handleOpenCreatorFlow}
                onOpenLectures={() => setActiveView('lecturas')}
                onOpenPlaylistModal={(track) => setPlaylistTrack(track)}
                tracks={queue}
                catalogLoading={catalogLoading}
                onSelectTrack={handleSelectTrack}
                isSearchModalOpen={isSearchModalOpen}
                setIsSearchModalOpen={setIsSearchModalOpen}
                onOpenSettings={() => {
                  setSettingsActiveTab('profile');
                  setShowSettingsModal(true);
                }}
              />
            ) : activeView === 'library' ||
              activeView === 'favorites' ||
              activeView.startsWith('library-') ? (
              <LibraryScreen
                session={session}
                onClose={() => setActiveView('catalog')}
                onOpenPlaylistModal={(track) => setPlaylistTrack(track)}
                initialCategory={getLibraryCategory()}
              />
            ) : activeView === 'shorts' ? (
              <ShortsScreen onClose={() => setActiveView('catalog')} />
            ) : activeView === 'video' ? (
              <VideoDetailScreen
                onClose={() => setActiveView('catalog')}
                onOpenPayItForward={() => setActiveView('donate')}
              />
            ) : activeView === 'lecturas' ? (
              <LecturesView onClose={() => setActiveView('catalog')} />
            ) : activeView === 'admin-review' ? (
              <AdminReviewView onClose={() => setActiveView('catalog')} />
            ) : activeView === 'donate' ? (
              <PayItForwardScreen onClose={() => setActiveView('catalog')} />
            ) : activeView === 'creator-pending' ? (
              <CreatorPendingScreen onClose={() => setActiveView('catalog')} />
            ) : (
              <CreatorStudio
                session={session}
                onClose={() => setActiveView('catalog')}
                onOpenPayItForward={() => setActiveView('donate')}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {isFullScreenOpen && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0B] flex flex-col">
          <FullScreenPlayer
            session={session}
            onOpenPlaylistModal={(track) => setPlaylistTrack(track)}
            onClose={closeFullScreen}
          />
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800 shadow-2xl">
        <MiniPlayer
          session={session}
          onOpenPlaylistModal={(track) => setPlaylistTrack(track)}
          isVideoFullscreen={
            activeView !== 'catalog' &&
            activeView !== 'creator' &&
            activeView !== 'library' &&
            activeView !== 'favorites'
          }
        />

        <div className="flex items-center justify-around py-3 px-4 bg-black/95 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => setIsSearchModalOpen(true)}
            className="flex flex-col items-center gap-1 text-zinc-400 hover:text-[#3CC8F5] transition-colors cursor-pointer"
          >
            <Search className="h-5 w-5" />
            <span className="text-[10px] font-bold">Buscar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('library')}
            className="flex flex-col items-center gap-1 text-zinc-400 hover:text-[#3CC8F5] transition-colors cursor-pointer"
          >
            <Library className="h-5 w-5 text-[#3CC8F5]" />
            <span className="text-[10px] font-bold">Biblioteca</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('donate')}
            className="flex flex-col items-center gap-1 text-zinc-400 hover:text-[#3CC8F5] transition-colors cursor-pointer"
          >
            <HeartHandshake className="h-5 w-5 text-emerald-400" />
            <span className="text-[10px] font-bold">Pay It Forward</span>
          </button>
        </div>
      </div>

      {playlistTrack && (
        <AddToPlaylistModal
          track={playlistTrack}
          session={session}
          onClose={() => setPlaylistTrack(null)}
        />
      )}

      {directLecture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-4xl h-[85vh] rounded-3xl border border-zinc-800 bg-[#121214] flex flex-col shadow-2xl overflow-hidden text-white">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-900/80 shrink-0">
              <div className="min-w-0 pr-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  {directLecture.category || 'Lectura'}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  {directLecture.title}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {(directLecture.pdf_url || directLecture.file_url || directLecture.audioUrl)
                  ?.toLowerCase()
                  .includes('.pdf') && (
                  <a
                    href={directLecture.pdf_url || directLecture.file_url || directLecture.audioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all cursor-pointer"
                  >
                    Abrir externo ↗
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setDirectLecture(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 cursor-pointer transition-all"
                  title="Cerrar lectura"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-zinc-950 p-4 sm:p-6">
              {(() => {
                const fileUrl =
                  directLecture.pdf_url || directLecture.file_url || directLecture.audioUrl || '';
                const isPdf =
                  fileUrl.toLowerCase().includes('.pdf') ||
                  fileUrl.toLowerCase().includes('application/pdf');

                if (isPdf && fileUrl) {
                  return (
                    <iframe
                      src={`${fileUrl}#view=FitH`}
                      title={directLecture.title}
                      className="w-full h-full min-h-[65vh] rounded-2xl border border-zinc-800 bg-white"
                    />
                  );
                }

                return (
                  <div className="max-w-2xl mx-auto space-y-6 py-2">
                    {directLecture.artworkUrl && (
                      <img
                        src={directLecture.artworkUrl}
                        alt={directLecture.title}
                        className="w-full h-60 object-cover rounded-2xl border border-zinc-800"
                      />
                    )}
                    <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                      {directLecture.content ||
                        directLecture.lyrics ||
                        directLecture.description ||
                        'Sin contenido de texto disponible.'}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg my-auto rounded-3xl border border-zinc-800 bg-[#121214] p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col text-white">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 shrink-0">
              <h3 className="text-base font-bold text-white">Ajustes</h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="rounded-lg p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-2 border-b border-zinc-800 pb-3 shrink-0 overflow-x-auto scrollbar-hide">
              <button
                type="button"
                onClick={() => setSettingsActiveTab('profile')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  settingsActiveTab === 'profile'
                    ? 'bg-[#3CC8F5] text-black'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                <User className="h-4 w-4" /> Perfil
              </button>
              <button
                type="button"
                onClick={() => setSettingsActiveTab('settings')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  settingsActiveTab === 'settings'
                    ? 'bg-[#3CC8F5] text-black'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                <Settings className="h-4 w-4" /> Ajustes
              </button>
              <button
                type="button"
                onClick={() => setSettingsActiveTab('notifications')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  settingsActiveTab === 'notifications'
                    ? 'bg-[#3CC8F5] text-black'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                <Bell className="h-4 w-4" /> Notificaciones
              </button>
              <button
                type="button"
                onClick={() => setSettingsActiveTab('theme')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  settingsActiveTab === 'theme'
                    ? 'bg-[#3CC8F5] text-black'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                <Palette className="h-4 w-4" /> Apariencia
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 py-2">
              {settingsActiveTab === 'profile' && (
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={currentAvatar}
                      alt="Avatar"
                      className="h-20 w-20 rounded-full object-cover border-2 border-[#3CC8F5] shadow-lg"
                    />
                    <label
                      className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-[#3CC8F5] cursor-pointer shadow-md transition-all"
                      title="Editar foto desde dispositivo"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>{uploading ? 'Subiendo...' : 'Editar foto'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">
                      O pega el enlace de tu foto (URL)
                    </label>
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://ejemplo.com/tu-foto.jpg"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#3CC8F5]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">
                      Nombre completo o apodo
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Tu nombre"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#3CC8F5]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setShowSettingsModal(false)}
                      className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-[#3CC8F5] px-4 py-2.5 text-xs font-bold text-black hover:opacity-90 cursor-pointer disabled:opacity-50"
                    >
                      {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </form>
              )}

              {settingsActiveTab === 'settings' && (
                <div className="space-y-4 text-zinc-300 text-xs">
                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                    <h4 className="font-bold text-white text-sm">Información de la cuenta</h4>
                    <p className="text-zinc-400">
                      Correo electrónico:{' '}
                      <span className="text-white font-medium">{session?.user?.email}</span>
                    </p>
                    <p className="text-zinc-400">
                      ID de usuario:{' '}
                      <span className="text-white font-mono text-[10px]">
                        {session?.user?.id}
                      </span>
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                    <h4 className="font-bold text-white text-sm">Privacidad y Seguridad</h4>
                    <p className="text-zinc-400">
                      Tus datos están protegidos bajo cifrado y autenticación segura con Supabase.
                    </p>
                  </div>
                </div>
              )}

              {settingsActiveTab === 'notifications' && (
                <div className="space-y-3 text-xs text-zinc-300">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                    <div>
                      <p className="font-bold text-white">Notificaciones push</p>
                      <p className="text-zinc-400 text-[11px]">
                        Recibe alertas de nuevo contenido y meditaciones
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="accent-[#3CC8F5] h-4 w-4 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                    <div>
                      <p className="font-bold text-white">Recordatorios de oración</p>
                      <p className="text-zinc-400 text-[11px]">
                        Avisos diarios para tu tiempo espiritual
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="accent-[#3CC8F5] h-4 w-4 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {settingsActiveTab === 'theme' && (
                <div className="space-y-3 text-xs text-zinc-300">
                  <p className="text-zinc-400">
                    Selecciona el modo de visualización de la aplicación:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => changeThemeMode(true)}
                      className={`p-4 rounded-2xl border text-left font-bold transition-all cursor-pointer flex flex-col gap-2 ${
                        isDarkTheme
                          ? 'border-[#3CC8F5] bg-[#3CC8F5]/10 text-white'
                          : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="text-sm">🌙 Tema Oscuro</span>
                      <span className="text-[10px] font-normal text-zinc-400">
                        Ideal para ambientes con poca luz y ahorro de batería
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => changeThemeMode(false)}
                      className={`p-4 rounded-2xl border text-left font-bold transition-all cursor-pointer flex flex-col gap-2 ${
                        !isDarkTheme
                          ? 'border-[#3CC8F5] bg-[#3CC8F5]/10 text-white'
                          : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="text-sm">☀️ Tema Claro</span>
                      <span className="text-[10px] font-normal text-zinc-400">
                        Mayor contraste para lectura bajo luz de día
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showOnboardingModal && (
        <CreatorOnboardingModal
          session={session}
          onClose={() => setShowOnboardingModal(false)}
          onSubmitted={() => {
            setShowOnboardingModal(false);
            setActiveView('creator-pending');
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  useTheme();
  const [session, setSession] = useState<any>(null);
  const [combinedTracks, setCombinedTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchPublishedTracks() {
      try {
        const { data, error } = await supabase
          .from('creator_content')
          .select('*')
          .eq('status', 'published');

        if (error) throw error;

        const supabaseTracks: Track[] = (data || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          artist: item.artist || item.category || 'Creador Sanctify',
          artworkUrl: item.artwork_url || DEFAULT_ARTWORK,
          audioUrl: item.file_url,
          category: (item.category as TrackCategory) || 'music',
          duration: item.duration ?? 0,
        }));
        setCombinedTracks(supabaseTracks);
      } catch (err) {
        console.error('Error al cargar contenido de Supabase:', err);
      } finally {
        setLoading(false);
      }
    }

    void fetchPublishedTracks();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <AuthProvider>
      <ReminderProvider>
        <AudioProvider queue={combinedTracks} session={session}>
          {!session ? (
            <LandingPage />
          ) : (
            <AppLayout catalogLoading={loading} session={session} onLogout={handleLogout} />
          )}
        </AudioProvider>
      </ReminderProvider>
    </AuthProvider>
  );
}