import { SacredHeartIcon } from '@/components/SacredHeartIcon';
import { useState, useEffect, useMemo, useRef, useCallback, type MouseEvent, type FormEvent } from 'react';
import {
  ArrowLeft,
  Music,
  AudioWaveform,
  Trash2,
  Play,
  Pause,
  MoreVertical,
  Folder,
  BookOpen,
  Mic,
  Video,
  ChevronRight,
  FolderPlus,
  X,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Edit2,
  Sparkles,
  Layers,
  Disc,
  FileText,
  AlertTriangle,
  Search,
  CalendarArrowDown,
  CalendarArrowUp,
  ListOrdered,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { supabase } from '../supabase';
import { useAudio, type AudioContextValue } from '@/context/AudioContext';
import { useAuth } from './AuthContext';
import type { Track, TrackCategory } from '@/types/audio';
import { AlbumDetailView } from '@/components/AlbumDetailView';

interface FolderItem {
  id: string;
  name: string;
  parent_id: string | null;
  color?: string;
  category?: string;
}

interface TrackEntry extends Track {
  createdAtMs: number | null;
}

type SortMode = 'default' | 'alpha_asc' | 'alpha_desc' | 'date_desc' | 'date_asc';

interface LibraryScreenProps {
  session?: any;
  onClose: () => void;
  onOpenPlaylistModal: (track: Track) => void;
  initialCategory?: 'favorites' | 'music' | 'podcast' | 'blog' | 'video' | 'albums' | 'series';
}

const DEFAULT_ARTWORK =
  'https://images.pexels.com/photos/426976/pexels-photo-426976.jpeg?auto=compress&cs=tinysrgb&w=600';

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

function parseTimestamp(rawDate?: string, title?: string): number | null {
  if (rawDate) {
    const parsed = Date.parse(rawDate);
    if (!Number.isNaN(parsed)) return parsed;
  }

  if (title) {
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
  }

  return null;
}

function mapSupabaseContentToTracks(rows: any[] | null | undefined): TrackEntry[] {
  const dynamicTracks: TrackEntry[] = (rows || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    artist: item.artist || item.category || 'Creador Sanctify',
    artworkUrl: item.artwork_url || DEFAULT_ARTWORK,
    audioUrl: item.file_url,
    file_url: item.file_url,
    category: (item.category as TrackCategory) || 'music',
    duration: item.duration ?? 0,
    lyrics: item.lyrics || item.description,
    createdAtMs: parseTimestamp(item.created_at || item.date, item.title),
  }));

  return dynamicTracks;
}

function matchesCategory(rawCat: string | undefined, targetTab: string): boolean {
  const itemCat = (rawCat || '').toLowerCase().trim();
  const normalizedTab = targetTab.toLowerCase().trim();

  if (normalizedTab === 'blog') {
    return itemCat === 'blog' || itemCat === 'lecturas' || itemCat === 'lectura';
  }
  if (normalizedTab === 'music') {
    return (
      itemCat === 'music' ||
      itemCat === 'música' ||
      itemCat === 'musica' ||
      itemCat === 'audiograma' ||
      itemCat === 'audio'
    );
  }
  if (normalizedTab === 'podcast') {
    return itemCat === 'podcast' || itemCat === 'podcasts';
  }
  if (normalizedTab === 'video') {
    return itemCat === 'video' || itemCat === 'videos';
  }
  if (normalizedTab === 'shorts') {
    return itemCat === 'short' || itemCat === 'shorts';
  }

  const asciiTab = normalizedTab.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return itemCat === normalizedTab || itemCat === asciiTab;
}

export default function LibraryScreen({
  session: propSession,
  onClose,
  onOpenPlaylistModal,
  initialCategory = 'favorites',
}: LibraryScreenProps) {
  const { session: authSession } = useAuth();
  const session = propSession || authSession;
  const userId = session?.user?.id;

  const [activeTab, setActiveTab] = useState<string>(initialCategory);
  const [favSubTab, setFavSubTab] = useState<'all' | 'music' | 'podcast' | 'blog' | 'video'>('all');

  const [catalogTracks, setCatalogTracks] = useState<TrackEntry[]>(() =>
    mapSupabaseContentToTracks(null)
  );
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [customFavOrder, setCustomFavOrder] = useState<string[] | null>(null);
  const [creatorAlbums, setCreatorAlbums] = useState<any[]>([]);
  const [creatorSeries, setCreatorSeries] = useState<any[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);

  // Mapa de carátulas para el collage de 4 imágenes por álbum/serie
  const [albumCollages, setAlbumCollages] = useState<Record<string, string[]>>({});

  // Estados para carpetas jerárquicas por categoría
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'General' },
  ]);
  const [tracksInFolder, setTracksInFolder] = useState<TrackEntry[]>([]);
  const [hiddenRootTrackIds, setHiddenRootTrackIds] = useState<Set<string>>(new Set());
  const [customListOrder, setCustomListOrder] = useState<Record<string, string[]>>({});

  // Búsqueda y ordenamiento en categoría / carpeta / favoritos
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [favSortMode, setFavSortMode] = useState<SortMode>('default');
  const [savingOrder, setSavingOrder] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Menú de opciones por pista para remover
  const [activeTrackMenuId, setActiveTrackMenuId] = useState<string | null>(null);

  // Modal para reportar contenido
  const [trackToReport, setTrackToReport] = useState<Track | null>(null);
  const [reportReason, setReportReason] = useState('Derechos de autor / Copyright');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccessMessage, setReportSuccessMessage] = useState('');

  // Modal para crear nueva carpeta
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#3CC8F5');

  // Modales y menús de carpetas
  const [activeFolderMenuId, setActiveFolderMenuId] = useState<string | null>(null);
  const [folderToEdit, setFolderToEdit] = useState<FolderItem | null>(null);
  const [editedFolderName, setEditedFolderName] = useState('');
  const [editedFolderColor, setEditedFolderColor] = useState('#3CC8F5');
  const [folderToDelete, setFolderToDelete] = useState<FolderItem | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const audio = useAudio();
  const { favorites, toggleFavorite } = useAudio();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const getThemeConfig = (tab: string) => {
    switch (tab) {
      case 'favorites':
        return {
          primaryBg: 'bg-red-500/10 dark:bg-[#990000]/40',
          primaryText: 'text-red-600 dark:text-[#EF4444]',
          borderActive: 'border-red-500/50',
          glowBg: 'bg-red-500/10 dark:bg-[#990000]/20',
          hoverText: 'group-hover:text-red-500 dark:group-hover:text-red-400',
          headerBgImage:
            'https://images.pexels.com/photos/1047442/pexels-photo-1047442.jpeg?auto=compress&cs=tinysrgb&w=1200',
        };
      case 'music':
        return {
          primaryBg: 'bg-blue-500/10 dark:bg-blue-600/40',
          primaryText: 'text-blue-600 dark:text-blue-400',
          borderActive: 'border-blue-500/50',
          glowBg: 'bg-blue-500/10 dark:bg-blue-500/20',
          hoverText: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
          headerBgImage:
            'https://images.pexels.com/photos/1762578/pexels-photo-1762578.jpeg?auto=compress&cs=tinysrgb&w=1200',
        };
      case 'podcast':
        return {
          primaryBg: 'bg-amber-500/10 dark:bg-amber-600/40',
          primaryText: 'text-amber-600 dark:text-amber-400',
          borderActive: 'border-amber-500/50',
          glowBg: 'bg-amber-500/10 dark:bg-amber-500/20',
          hoverText: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
          headerBgImage:
            'https://images.pexels.com/photos/6953870/pexels-photo-6953870.jpeg?auto=compress&cs=tinysrgb&w=1200',
        };
      case 'blog':
        return {
          primaryBg: 'bg-emerald-500/10 dark:bg-emerald-600/40',
          primaryText: 'text-emerald-600 dark:text-emerald-400',
          borderActive: 'border-emerald-500/50',
          glowBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
          hoverText: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
          headerBgImage:
            'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=1200',
        };
      case 'video':
        return {
          primaryBg: 'bg-purple-500/10 dark:bg-purple-600/40',
          primaryText: 'text-purple-600 dark:text-purple-400',
          borderActive: 'border-purple-500/50',
          glowBg: 'bg-purple-500/10 dark:bg-purple-500/20',
          hoverText: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
          headerBgImage:
            'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=1200',
        };
      case 'albums':
        return {
          primaryBg: 'bg-pink-500/10 dark:bg-pink-600/40',
          primaryText: 'text-pink-600 dark:text-pink-400',
          borderActive: 'border-pink-500/50',
          glowBg: 'bg-pink-500/10 dark:bg-pink-500/20',
          hoverText: 'group-hover:text-pink-600 dark:group-hover:text-pink-400',
          headerBgImage:
            'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=1200',
        };
      case 'series':
        return {
          primaryBg: 'bg-amber-500/10 dark:bg-amber-600/40',
          primaryText: 'text-amber-600 dark:text-amber-400',
          borderActive: 'border-amber-500/50',
          glowBg: 'bg-amber-500/10 dark:bg-amber-500/20',
          hoverText: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
          headerBgImage:
            'https://images.pexels.com/photos/3945313/pexels-photo-3945313.jpeg?auto=compress&cs=tinysrgb&w=1200',
        };
      default:
        return {
          primaryBg: 'bg-[#3CC8F5]/10 dark:bg-[#3CC8F5]/40',
          primaryText: 'text-[#3CC8F5]',
          borderActive: 'border-[#3CC8F5]/50',
          glowBg: 'bg-[#3CC8F5]/10 dark:bg-[#3CC8F5]/20',
          hoverText: 'group-hover:text-[#3CC8F5]',
          headerBgImage:
            'https://images.pexels.com/photos/426976/pexels-photo-426976.jpeg?auto=compress&cs=tinysrgb&w=1200',
        };
    }
  };

  const theme = getThemeConfig(activeTab);

  type PlaybackSource = AudioContextValue['playbackSource'];

  const checkIsPdf = useCallback((track: Track) => {
    const fileUrl = ((track as any).file_url || track.audioUrl || '').toLowerCase();
    const rawCat = (track.category || '').toLowerCase().trim();
    const title = (track.title || '').toLowerCase();
    return (
      fileUrl.includes('.pdf') ||
      rawCat === 'blog' ||
      rawCat === 'lectura' ||
      rawCat === 'lecturas' ||
      title.includes('.pdf')
    );
  }, []);

  const getCategoryBgImage = (category: string) => {
    switch ((category || '').toLowerCase().trim()) {
      case 'favorites':
        return 'https://images.pexels.com/photos/1047442/pexels-photo-1047442.jpeg?auto=compress&cs=tinysrgb&w=800';
      case 'music':
      case 'música':
      case 'musica':
        return 'https://images.pexels.com/photos/1762578/pexels-photo-1762578.jpeg?auto=compress&cs=tinysrgb&w=800';
      case 'podcast':
      case 'podcasts':
        return 'https://images.pexels.com/photos/6953870/pexels-photo-6953870.jpeg?auto=compress&cs=tinysrgb&w=800';
      case 'blog':
      case 'lectura':
      case 'lecturas':
        return 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=800';
      case 'video':
      case 'videos':
        return 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=800';
      default:
        return 'https://images.pexels.com/photos/426976/pexels-photo-426976.jpeg?auto=compress&cs=tinysrgb&w=800';
    }
  };

  const openItemAction = (track: Track, list: Track[], source: PlaybackSource) => {
    const isPdf = checkIsPdf(track) || activeTab === 'blog';
    if (isPdf) {
      window.dispatchEvent(new CustomEvent('open-lecturas-view', { detail: track }));
      return;
    }
    if (audio.currentTrack?.id !== track.id) {
      audio.playTrack(track, list, source);
    }
    audio.openFullScreen();
  };

  const playAll = (list: Track[], source: PlaybackSource) => {
    const playableList = list.filter((t) => !checkIsPdf(t));
    if (playableList.length === 0) return;
    audio.playTrack(playableList[0], playableList, source);
    audio.openFullScreen();
  };

  // Carga única del catálogo publicado
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('creator_content')
          .select('*')
          .eq('status', 'published');
        if (!error && active) {
          setCatalogTracks(mapSupabaseContentToTracks(data));
        }
      } catch (err) {
        console.error('Error cargando contenido publicado:', err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Carga de favoritos desde Supabase o contexto local
  useEffect(() => {
    let active = true;
    (async () => {
      if (!userId) {
        if (active) {
          setFavoriteIds(new Set(Array.from(favorites).map(String)));
        }
        return;
      }
      try {
        const { data, error } = await supabase
          .from('favorites')
          .select('track_id')
          .eq('user_id', userId);
        if (!error && data && active) {
          setFavoriteIds(new Set(data.map((f) => String(f.track_id))));
        }
      } catch (err) {
        console.error('Error cargando favoritos:', err);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId, favorites]);

  // Carga de álbumes, series y carpetas
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: albumsData, error } = await supabase
          .from('playlists_albums')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && albumsData && active) {
          setCreatorAlbums(albumsData.filter((item: any) => item.type === 'album'));
          setCreatorSeries(
            albumsData.filter((item: any) => item.type === 'podcast' || item.type === 'series')
          );

          const albumIds = albumsData.map((a: any) => a.id);
          if (albumIds.length > 0) {
            const { data: tracksData } = await supabase
              .from('creator_content')
              .select('album_id, artwork_url')
              .in('album_id', albumIds);

            const collagesMap: Record<string, string[]> = {};
            for (const alb of albumsData) {
              const albTracks = (tracksData || []).filter((t: any) => t.album_id === alb.id);
              const defaultArt = alb.artwork_url || DEFAULT_ARTWORK;
              const extracted = albTracks
                .map((t: any) => t.artwork_url)
                .filter((url: string | null): url is string => Boolean(url));
              collagesMap[alb.id] = [...extracted, defaultArt, defaultArt, defaultArt, defaultArt].slice(
                0,
                4
              );
            }
            if (active) setAlbumCollages(collagesMap);
          }
        }
      } catch (err) {
        console.error('Error cargando álbumes y series:', err);
      }

      if (!userId) return;
      try {
        const { data: folderRows, error: folderErr } = await supabase
          .from('user_folders')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (!folderErr && folderRows && active) {
          setFolders(folderRows);
        }
      } catch (err) {
        console.error('Error cargando carpetas:', err);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  // Reiniciar navegación de carpeta al cambiar pestaña
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentFolderId(null);
    setBreadcrumbs([{ id: null, name: 'General' }]);
    setTracksInFolder([]);
    setSelectedAlbumId(null);
    setSearchQuery('');
    setSortMode('default');
  }, [activeTab]);

  // Cargar pistas de carpeta cuando cambia currentFolderId
  useEffect(() => {
    if (!currentFolderId) {
      setTracksInFolder([]);
      return;
    }

    let active = true;
    (async () => {
      try {
        const { data: folderRows, error } = await supabase
          .from('folder_tracks')
          .select('track_id, position')
          .eq('folder_id', currentFolderId)
          .order('position', { ascending: true });

        if (error || !folderRows || !active) {
          if (active) setTracksInFolder([]);
          return;
        }

        const trackById = new Map(catalogTracks.map((t) => [String(t.id), t]));
        const ordered = folderRows
          .map((row: { track_id: string }) => trackById.get(String(row.track_id)))
          .filter((t): t is TrackEntry => t !== undefined);

        if (active) setTracksInFolder(ordered);
      } catch (err) {
        console.error('Error cargando pistas de carpeta:', err);
        if (active) setTracksInFolder([]);
      }
    })();

    return () => {
      active = false;
    };
  }, [currentFolderId, catalogTracks]);

  const applySortAndSearch = useCallback(
    (
      items: TrackEntry[],
      query: string,
      mode: SortMode,
      customIds?: string[] | null
    ): TrackEntry[] => {
      const orderMap = customIds ? new Map(customIds.map((id, idx) => [id, idx])) : null;
      const baseList = orderMap
        ? [...items].sort((a, b) => {
            const idxA = orderMap.get(String(a.id)) ?? Number.MAX_SAFE_INTEGER;
            const idxB = orderMap.get(String(b.id)) ?? Number.MAX_SAFE_INTEGER;
            return idxA - idxB;
          })
        : [...items];

      const q = query.trim().toLowerCase();
      const filtered = q
        ? baseList.filter(
            (t) =>
              (t.title || '').toLowerCase().includes(q) ||
              (t.artist || '').toLowerCase().includes(q) ||
              (t.category || '').toLowerCase().includes(q)
          )
        : baseList;

      if (mode === 'default') return filtered;

      if (mode === 'alpha_asc') {
        return [...filtered].sort((a, b) =>
          (a.title || '').localeCompare(b.title || '', 'es', { sensitivity: 'base', numeric: true })
        );
      }

      if (mode === 'alpha_desc') {
        return [...filtered].sort((a, b) =>
          (b.title || '').localeCompare(a.title || '', 'es', { sensitivity: 'base', numeric: true })
        );
      }

      const dir = mode === 'date_desc' ? -1 : 1;
      return [...filtered].sort((a, b) => {
        if (a.createdAtMs !== null && b.createdAtMs !== null && a.createdAtMs !== b.createdAtMs) {
          return (a.createdAtMs - b.createdAtMs) * dir;
        }
        if (a.createdAtMs !== null && b.createdAtMs === null) return -1;
        if (a.createdAtMs === null && b.createdAtMs !== null) return 1;
        return (a.title || '').localeCompare(b.title || '', 'es', {
          sensitivity: 'base',
          numeric: true,
        });
      });
    },
    []
  );

  const favoriteTracks = useMemo(() => {
    const matched = catalogTracks.filter((t) => {
      if (!favoriteIds.has(String(t.id))) return false;
      if (favSubTab === 'all') return true;
      return matchesCategory(t.category, favSubTab);
    });
    return applySortAndSearch(matched, searchQuery, favSortMode, customFavOrder);
  }, [catalogTracks, favoriteIds, favSubTab, searchQuery, favSortMode, customFavOrder, applySortAndSearch]);

  const currentScopeKey = currentFolderId ? `folder:${currentFolderId}` : `root:${activeTab}`;

  const activeDisplayTracks = useMemo(() => {
    if (activeTab === 'favorites') {
      return favoriteTracks;
    }

    const sourceList = currentFolderId
      ? tracksInFolder
      : catalogTracks.filter(
          (t) => matchesCategory(t.category, activeTab) && !hiddenRootTrackIds.has(String(t.id))
        );

    return applySortAndSearch(sourceList, searchQuery, sortMode, customListOrder[currentScopeKey]);
  }, [
    activeTab,
    favoriteTracks,
    currentFolderId,
    tracksInFolder,
    catalogTracks,
    hiddenRootTrackIds,
    searchQuery,
    sortMode,
    customListOrder,
    currentScopeKey,
    applySortAndSearch,
  ]);

  const handleRemoveTrackFromCurrentView = async (track: Track, e: MouseEvent) => {
    e.stopPropagation();
    setActiveTrackMenuId(null);
    const idStr = String(track.id);

    try {
      if (activeTab === 'favorites') {
        if (userId) {
          const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', userId)
            .eq('track_id', track.id);
          if (error) throw error;
        }
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(idStr);
          return next;
        });
      } else if (currentFolderId) {
        const { error } = await supabase
          .from('folder_tracks')
          .delete()
          .eq('folder_id', currentFolderId)
          .eq('track_id', track.id);
        if (error) throw error;
        setTracksInFolder((prev) => prev.filter((t) => String(t.id) !== idStr));
      } else {
        setHiddenRootTrackIds((prev) => new Set(prev).add(idStr));
      }
    } catch (err) {
      console.error('Error al remover el elemento de la lista:', err);
    }
  };

  const handleSendReport = async (e: FormEvent) => {
    e.preventDefault();
    if (!trackToReport || !userId) return;

    try {
      setIsSubmittingReport(true);
      const { error } = await supabase.from('content_reports').insert({
        user_id: userId,
        content_id: trackToReport.id,
        content_title: trackToReport.title,
        reason: reportReason,
        description: reportDescription.trim(),
        status: 'pending',
      });

      if (error) throw error;

      setReportSuccessMessage('¡Reporte enviado exitosamente! Gracias por avisarnos.');
      setTimeout(() => {
        setTrackToReport(null);
        setReportSuccessMessage('');
        setReportDescription('');
      }, 2000);
    } catch (err) {
      console.error('Error al enviar el reporte:', err);
      alert('Hubo un error al enviar el reporte. Inténtalo de nuevo.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const saveNewPositionsToSupabase = async (updatedTracks: TrackEntry[]) => {
    if (!currentFolderId) return;
    try {
      setSavingOrder(true);
      const updates = updatedTracks.map((track, index) =>
        supabase
          .from('folder_tracks')
          .update({ position: index + 1 })
          .eq('track_id', track.id)
          .eq('folder_id', currentFolderId)
      );
      await Promise.all(updates);
    } catch (err) {
      console.error('Error al guardar el nuevo orden:', err);
    } finally {
      setSavingOrder(false);
    }
  };

  const handleOnDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(activeDisplayTracks);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    if (activeTab === 'favorites') {
      setFavSortMode('default');
      setCustomFavOrder(reordered.map((t) => String(t.id)));
      return;
    }

    setSortMode('default');
    setCustomListOrder((prev) => ({
      ...prev,
      [currentScopeKey]: reordered.map((t) => String(t.id)),
    }));
    if (currentFolderId) {
      void saveNewPositionsToSupabase(reordered);
    }
  };

  const handleCreateFolder = async (e: FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !userId) return;

    try {
      const { data, error } = await supabase
        .from('user_folders')
        .insert({
          user_id: userId,
          name: newFolderName.trim(),
          parent_id: currentFolderId,
          color: newFolderColor,
          category: activeTab,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) setFolders((prev) => [...prev, data]);
      setNewFolderName('');
      setIsCreatingFolder(false);
    } catch (err) {
      console.error('Error al crear carpeta:', err);
    }
  };

  const handleOpenEditFolder = (folder: FolderItem, e: MouseEvent) => {
    e.stopPropagation();
    setFolderToEdit(folder);
    setEditedFolderName(folder.name);
    setEditedFolderColor(folder.color || '#3CC8F5');
    setActiveFolderMenuId(null);
  };

  const handleConfirmEditFolder = async (e: FormEvent) => {
    e.preventDefault();
    if (!folderToEdit || !editedFolderName.trim()) return;

    try {
      const { error } = await supabase
        .from('user_folders')
        .update({ name: editedFolderName.trim(), color: editedFolderColor })
        .eq('id', folderToEdit.id);

      if (error) throw error;

      setFolders((prev) =>
        prev.map((f) =>
          f.id === folderToEdit.id
            ? { ...f, name: editedFolderName.trim(), color: editedFolderColor }
            : f
        )
      );
      setFolderToEdit(null);
    } catch (err) {
      console.error('Error al actualizar carpeta:', err);
    }
  };

  const handleOpenDeleteFolder = (folder: FolderItem, e: MouseEvent) => {
    e.stopPropagation();
    setFolderToDelete(folder);
    setShowConfirmModal(true);
    setActiveFolderMenuId(null);
  };

  const handleConfirmDeleteFolder = async () => {
    if (!folderToDelete) return;

    try {
      const { error } = await supabase.from('user_folders').delete().eq('id', folderToDelete.id);
      if (error) throw error;

      setFolders((prev) => prev.filter((f) => f.id !== folderToDelete.id));
      if (currentFolderId === folderToDelete.id) {
        setCurrentFolderId(null);
        setBreadcrumbs([{ id: null, name: 'General' }]);
      }
      setShowConfirmModal(false);
      setFolderToDelete(null);
    } catch (err) {
      console.error('Error al eliminar carpeta:', err);
    }
  };

  const handleOpenFolder = (folder: FolderItem) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSearchQuery('');
    setSortMode('default');
  };

  const handleBreadcrumbClick = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    setCurrentFolderId(newBreadcrumbs[newBreadcrumbs.length - 1].id);
  };

  const currentCategoryFolders = useMemo(
    () =>
      folders.filter(
        (f) =>
          (f.category === activeTab || (!f.category && activeTab === 'music')) &&
          f.parent_id === currentFolderId
      ),
    [folders, activeTab, currentFolderId]
  );

  const activeCollections = useMemo(() => {
    if (activeTab === 'albums') return creatorAlbums;
    if (activeTab === 'series') return creatorSeries;
    return [];
  }, [activeTab, creatorAlbums, creatorSeries]);

  const categoriesList = useMemo(() => {
    const allTabs = [
      { id: 'favorites', label: 'Mis Favoritos', icon: SacredHeartIcon },
      { id: 'music', label: 'Mi Música', icon: AudioWaveform },
      { id: 'podcast', label: 'Mis Podcasts', icon: Mic },
      { id: 'blog', label: 'Mis Lecturas', icon: BookOpen },
      { id: 'video', label: 'Mis Videos', icon: Video },
      { id: 'albums', label: 'Artistas / Álbumes', icon: Disc },
      { id: 'series', label: 'Series / Programas', icon: Layers },
    ];
    const selectedTabObj = allTabs.find((t) => t.id === activeTab);
    if (!selectedTabObj) return allTabs;
    return [selectedTabObj, ...allTabs.filter((t) => t.id !== activeTab)];
  }, [activeTab]);

  const currentSortMode = activeTab === 'favorites' ? favSortMode : sortMode;
  const setCurrentSortMode = (mode: SortMode) => {
    if (activeTab === 'favorites') setFavSortMode(mode);
    else setSortMode(mode);
  };

  const sortOptions: { id: SortMode; label: string; icon: typeof ListOrdered }[] = [
    { id: 'default', label: 'Orden', icon: ListOrdered },
    { id: 'alpha_asc', label: 'A–Z', icon: ArrowUp },
    { id: 'alpha_desc', label: 'Z–A', icon: ArrowDown },
    { id: 'date_desc', label: 'Fecha: Mayor a menor', icon: CalendarArrowDown },
    { id: 'date_asc', label: 'Fecha: Menor a mayor', icon: CalendarArrowUp },
  ];

  const activeCategoryHeading =
    activeTab === 'music'
      ? 'Música'
      : activeTab === 'podcast'
      ? 'Podcasts'
      : activeTab === 'blog'
      ? 'Lecturas'
      : activeTab === 'video'
      ? 'Videos'
      : activeTab === 'favorites'
      ? 'Favoritos'
      : activeTab;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0B] pb-32 text-zinc-900 dark:text-white relative transition-colors duration-200">
      {/* BLOQUE SUPERIOR UNIFICADO */}
      <div
        className="relative z-20 border-b border-zinc-200 dark:border-zinc-800 bg-no-repeat bg-cover bg-center overflow-hidden shadow-xl"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.55)), url(${theme.headerBgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-white/60 dark:bg-[#0A0A0B]/60 backdrop-blur-[1px] pointer-events-none transition-colors duration-200" />

        <div className="relative z-10 mx-auto max-w-5xl px-4 pt-16 pb-10 sm:px-6 space-y-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={
                  selectedAlbumId
                    ? () => setSelectedAlbumId(null)
                    : onClose
                }
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-zinc-300 dark:border-zinc-700 bg-white/90 dark:bg-black/70 text-zinc-900 dark:text-white backdrop-blur-md hover:bg-white dark:hover:bg-black cursor-pointer transition-all shadow-xl"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white drop-shadow-md">
                  {selectedAlbumId
                    ? 'Detalle de la Colección'
                    : activeTab === 'music'
                    ? 'Mi Música'
                    : activeTab === 'podcast'
                    ? 'Mis Podcasts'
                    : activeTab === 'blog'
                    ? 'Mis Lecturas'
                    : activeTab === 'video'
                    ? 'Mis Videos'
                    : activeTab === 'albums'
                    ? 'Artistas / Álbumes'
                    : activeTab === 'series'
                    ? 'Series / Programas'
                    : 'Mis Favoritos'}
                </h1>
                <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-200 drop-shadow mt-1 font-semibold">
                  Organización y contenidos por categoría
                </p>
              </div>
            </div>

            <div className="flex h-16 w-16 shrink-0 items-center justify-center transition-all duration-300 overflow-hidden p-0">
              <img
                src="/Sanctify_Icon_white.png"
                alt="Sanctify Logo"
                className="h-full w-full rounded-2xl object-cover shadow-2xl dark:hidden"
              />
              <img
                src="/Sanctify_Icon_black.png"
                alt="Sanctify Logo"
                className="hidden h-full w-full rounded-2xl object-cover shadow-2xl dark:block"
              />
            </div>
          </div>

          {/* BARRA DE PESTAÑAS */}
          <div className="flex gap-3 overflow-x-auto scrollbar-hide py-2 px-1">
            {categoriesList.map(({ id, label, icon: Icon }) => {
              const isSelected = activeTab === id;
              const tabTheme = getThemeConfig(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2.5 rounded-2xl px-5 py-3 text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 backdrop-blur-md shadow-lg ${
                    isSelected
                      ? `${tabTheme.primaryBg} ${tabTheme.primaryText} border ${tabTheme.borderActive} scale-105 shadow-xl`
                      : 'border border-zinc-300 dark:border-zinc-700/60 text-zinc-800 dark:text-zinc-200 bg-white/90 dark:bg-black/60 hover:bg-white dark:hover:bg-black/90 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 fill-current shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {selectedAlbumId ? (
            <div>
              <div className="mb-6 flex items-center justify-between gap-3 overflow-x-auto pb-3 border-b border-zinc-200 dark:border-zinc-800/80 scrollbar-hide">
                <button
                  type="button"
                  onClick={() => setSelectedAlbumId(null)}
                  className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-300 hover:text-black dark:hover:text-white bg-white/95 dark:bg-zinc-900/90 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-800 shrink-0 cursor-pointer backdrop-blur-md shadow-sm"
                >
                  ← Ver todos los mosaicos
                </button>

                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                  {activeCollections.map((col) => {
                    const isCurrent = col.id === selectedAlbumId;
                    const activeColor =
                      activeTab === 'albums'
                        ? 'border-pink-500 bg-pink-500/20 text-pink-600 dark:text-pink-400'
                        : 'border-amber-500 bg-amber-500/20 text-amber-600 dark:text-amber-400';
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setSelectedAlbumId(col.id)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold shrink-0 cursor-pointer transition-all backdrop-blur-md ${
                          isCurrent
                            ? activeColor
                            : 'border-zinc-300 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                        }`}
                      >
                        <img
                          src={col.artwork_url || DEFAULT_ARTWORK}
                          alt={col.title}
                          className="h-5 w-5 rounded-md object-cover"
                        />
                        <span className="truncate max-w-[120px]">{col.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <AlbumDetailView
                albumId={selectedAlbumId}
                onBack={() => setSelectedAlbumId(null)}
                onOpenPlaylistModal={onOpenPlaylistModal}
              />
            </div>
          ) : (
            <>
              {activeTab === 'favorites' && (
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {(['all', 'music', 'podcast', 'blog', 'video'] as const).map((sub) => {
                      const isSubSelected = favSubTab === sub;
                      const labelMap: Record<string, string> = {
                        all: 'TODO',
                        music: 'MÚSICA',
                        podcast: 'PODCAST',
                        blog: 'LECTURA',
                        video: 'VIDEO',
                      };

                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setFavSubTab(sub)}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all backdrop-blur-md ${
                            isSubSelected
                              ? 'bg-red-500/20 dark:bg-[#990000]/40 text-red-600 dark:text-white font-bold shadow-md border border-red-500/50'
                              : 'bg-white/90 dark:bg-zinc-900/80 text-zinc-800 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-800'
                          }`}
                        >
                          {labelMap[sub] || sub.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'albums' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400">
                      Discografía y Producciones ({creatorAlbums.length})
                    </h3>
                  </div>

                  {creatorAlbums.length === 0 ? (
                    <div className="py-20 text-center text-zinc-500 space-y-3">
                      <Disc className="mx-auto h-12 w-12 text-pink-500/40" />
                      <p className="text-sm font-semibold">
                        No hay álbumes creados o publicados todavía.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-4">
                      {creatorAlbums.map((album) => {
                        const collageImgs = albumCollages[album.id] || [
                          album.artwork_url || DEFAULT_ARTWORK,
                          album.artwork_url || DEFAULT_ARTWORK,
                          album.artwork_url || DEFAULT_ARTWORK,
                          album.artwork_url || DEFAULT_ARTWORK,
                        ];
                        const albumCardBg = getCategoryBgImage('albums');

                        return (
                          <div
                            key={album.id}
                            onClick={() => setSelectedAlbumId(album.id)}
                            className="group relative overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-[#121214]/90 backdrop-blur-md hover:border-pink-500/60 hover:bg-white dark:hover:bg-zinc-900 transition-all duration-300 cursor-pointer p-5 flex flex-col justify-between shadow-xl"
                            style={{
                              backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.55)), url(${albumCardBg})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          >
                            <div className="grid grid-cols-2 gap-1.5 aspect-[2/1] w-full overflow-hidden rounded-2xl bg-zinc-900/40 mb-4 shadow-inner">
                              <img
                                src={collageImgs[0]}
                                alt={album.title}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              <img
                                src={collageImgs[1]}
                                alt={album.title}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90"
                              />
                              <img
                                src={collageImgs[2]}
                                alt={album.title}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80"
                              />
                              <img
                                src={collageImgs[3]}
                                alt={album.title}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-70"
                              />
                            </div>

                            <div className="space-y-1 p-3 rounded-2xl bg-black/40 backdrop-blur-md">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-pink-400">
                                  Álbum
                                </span>
                                <span className="text-[10px] text-zinc-300 font-medium">
                                  Colección Oficial
                                </span>
                              </div>
                              <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-pink-400 transition-colors truncate">
                                {album.title}
                              </h3>
                              <p className="text-xs text-zinc-200 line-clamp-2 leading-relaxed">
                                {album.description ||
                                  album.author ||
                                  'Explora las pistas y producciones de este álbum.'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'series' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Series y Programas ({creatorSeries.length})
                    </h3>
                  </div>

                  {creatorSeries.length === 0 ? (
                    <div className="py-20 text-center text-zinc-500 space-y-3">
                      <Layers className="mx-auto h-12 w-12 text-amber-500/40" />
                      <p className="text-sm font-semibold">
                        No hay series o programas publicados todavía.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-4">
                      {creatorSeries.map((series) => {
                        const collageImgs = albumCollages[series.id] || [
                          series.artwork_url || DEFAULT_ARTWORK,
                          series.artwork_url || DEFAULT_ARTWORK,
                          series.artwork_url || DEFAULT_ARTWORK,
                          series.artwork_url || DEFAULT_ARTWORK,
                        ];
                        const seriesCardBg = getCategoryBgImage('podcast');

                        return (
                          <div
                            key={series.id}
                            onClick={() => setSelectedAlbumId(series.id)}
                            className="group relative overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-[#121214]/90 backdrop-blur-md hover:border-amber-500/60 hover:bg-white dark:hover:bg-zinc-900 transition-all duration-300 cursor-pointer p-5 flex flex-col justify-between shadow-xl"
                            style={{
                              backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.55)), url(${seriesCardBg})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          >
                            <div className="grid grid-cols-2 gap-1.5 aspect-[2/1] w-full overflow-hidden rounded-2xl bg-zinc-900/40 mb-4 shadow-inner">
                              <img
                                src={collageImgs[0]}
                                alt={series.title}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              <img
                                src={collageImgs[1]}
                                alt={series.title}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90"
                              />
                              <img
                                src={collageImgs[2]}
                                alt={series.title}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80"
                              />
                              <img
                                src={collageImgs[3]}
                                alt={series.title}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-70"
                              />
                            </div>

                            <div className="space-y-1 p-3 rounded-2xl bg-black/40 backdrop-blur-md">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                                  Serie / Programa
                                </span>
                                <span className="text-[10px] text-zinc-300 font-medium">
                                  Programa Oficial
                                </span>
                              </div>
                              <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                                {series.title}
                              </h3>
                              <p className="text-xs text-zinc-200 line-clamp-2 leading-relaxed">
                                {series.description ||
                                  series.author ||
                                  'Explora las enseñanzas y reflexiones de este programa.'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab !== 'albums' && activeTab !== 'series' && activeTab !== 'favorites' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white/90 dark:bg-[#121214]/80 backdrop-blur-md p-3 scrollbar-hide shadow-sm">
                    {breadcrumbs.map((crumb, idx) => (
                      <div key={crumb.id || 'root'} className="flex items-center gap-2 shrink-0">
                        {idx > 0 && <ChevronRight className="h-4 w-4 text-zinc-500" />}
                        <button
                          type="button"
                          onClick={() => handleBreadcrumbClick(idx)}
                          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                            idx === breadcrumbs.length - 1
                              ? `${theme.primaryBg} ${theme.primaryText} border ${theme.borderActive}`
                              : 'bg-zinc-100 dark:bg-zinc-900/90 text-zinc-800 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white'
                          }`}
                        >
                          {crumb.name}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-200 drop-shadow-sm">
                      Carpetas en {breadcrumbs[breadcrumbs.length - 1].name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsCreatingFolder(true)}
                      className={`flex items-center gap-1.5 rounded-xl ${theme.primaryBg} px-4 py-2.5 text-xs font-bold ${theme.primaryText} border ${theme.borderActive} hover:opacity-90 transition-all cursor-pointer backdrop-blur-md shadow-md`}
                    >
                      <FolderPlus className="h-4 w-4" /> + Nueva Carpeta
                    </button>
                  </div>

                  {isCreatingFolder && (
                    <form
                      onSubmit={handleCreateFolder}
                      className={`flex gap-2 rounded-2xl border ${theme.borderActive}/40 bg-white dark:bg-[#121214]/95 backdrop-blur-md p-4 shadow-xl`}
                    >
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Nombre de la carpeta o subcarpeta..."
                        className={`flex-1 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white outline-none focus:${theme.borderActive}`}
                        autoFocus
                      />
                      <input
                        type="color"
                        value={newFolderColor}
                        onChange={(e) => setNewFolderColor(e.target.value)}
                        className="h-10 w-10 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-transparent cursor-pointer"
                      />
                      <button
                        type="submit"
                        className={`rounded-xl ${theme.primaryBg} px-4 py-2.5 text-xs font-bold ${theme.primaryText} border ${theme.borderActive} cursor-pointer`}
                      >
                        Crear
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCreatingFolder(false)}
                        className="rounded-xl border border-zinc-300 dark:border-zinc-800 px-3 py-2.5 text-zinc-500 dark:text-zinc-400 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </form>
                  )}

                  {currentCategoryFolders.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 items-start pb-2">
                      {currentCategoryFolders.map((folder) => (
                        <div
                          key={folder.id}
                          onClick={() => handleOpenFolder(folder)}
                          className={`group relative flex flex-col justify-between rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white/90 dark:bg-[#121214]/90 backdrop-blur-md p-4 cursor-pointer transition-all hover:${theme.borderActive} shadow-lg`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-xl"
                              style={{
                                backgroundColor: `${folder.color || '#3CC8F5'}20`,
                                color: folder.color || '#3CC8F5',
                              }}
                            >
                              <Folder className="h-5 w-5 fill-current" />
                            </div>

                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveFolderMenuId(
                                    activeFolderMenuId === folder.id ? null : folder.id
                                  );
                                }}
                                className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {activeFolderMenuId === folder.id && (
                                <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-1.5 shadow-2xl">
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenEditFolder(folder, e)}
                                    className={`flex w-full items-center gap-2 px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:${theme.primaryText} cursor-pointer`}
                                  >
                                    <Edit2 className="h-3.5 w-3.5" /> Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenDeleteFolder(folder, e)}
                                    className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <h4
                            className={`text-xs font-bold text-zinc-900 dark:text-white truncate ${theme.hoverText}`}
                          >
                            {folder.name}
                          </h4>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL: PISTAS / CONTENIDO CON BUSCADOR Y FILTROS DE ORDEN */}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {!selectedAlbumId && activeTab !== 'albums' && activeTab !== 'series' && (
          <div className="space-y-6">
            <div className="space-y-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-400">
                    Pistas / Contenido ({activeDisplayTracks.length}){' '}
                    {savingOrder && '• Guardando orden...'}
                  </h3>

                  {activeDisplayTracks.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        playAll(activeDisplayTracks, {
                          type: 'folder',
                          title: breadcrumbs[breadcrumbs.length - 1].name,
                        })
                      }
                      className={`flex items-center gap-1.5 rounded-xl ${theme.primaryBg} px-3.5 py-1.5 text-xs font-bold ${theme.primaryText} border ${theme.borderActive} cursor-pointer hover:opacity-90 shrink-0`}
                    >
                      <Play className="h-3.5 w-3.5 fill-current" /> Reproducir
                    </button>
                  )}
                </div>

                {/* Buscador con lupa de acceso directo */}
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Buscar en ${activeCategoryHeading}...`}
                    aria-label={`Buscar en ${activeCategoryHeading}`}
                    className="w-full rounded-full border border-zinc-300 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 pl-9 pr-8 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-500 outline-none focus:border-[#3CC8F5]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Limpiar búsqueda"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-zinc-400 hover:text-white cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filtros rápidos de orden */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {sortOptions.map(({ id, label, icon: Icon }) => {
                  const isActiveSort = currentSortMode === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setCurrentSortMode(id)}
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                        isActiveSort
                          ? `${theme.borderActive} ${theme.glowBg} ${theme.primaryText} border`
                          : 'border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {activeDisplayTracks.length > 0 ? (
              <DragDropContext onDragEnd={handleOnDragEnd}>
                <Droppable droppableId="tracks-grid">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 items-start"
                    >
                      {activeDisplayTracks.map((track, index) => {
                        const isActive = audio?.currentTrack?.id === track.id;
                        const isPlaying = isActive && audio?.isPlaying;
                        const isPdf = checkIsPdf(track) || activeTab === 'blog';
                        const trackCardBg = getCategoryBgImage(track.category);
                        const isFav = favoriteIds.has(String(track.id));

                        return (
                          <Draggable key={String(track.id)} draggableId={String(track.id)} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                onClick={() =>
                                  openItemAction(track, activeDisplayTracks, {
                                    type: 'folder',
                                    title: breadcrumbs[breadcrumbs.length - 1].name,
                                  })
                                }
                                className={`group relative flex flex-col justify-between rounded-2xl border p-3 cursor-pointer transition-all duration-300 overflow-hidden ${
                                  isActive && !isPdf
                                    ? `${theme.borderActive} ${theme.glowBg} animate-border-glow`
                                    : 'border-zinc-200/40 dark:border-zinc-800/40 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm'
                                } ${snapshot.isDragging ? `shadow-2xl ring-2 ${theme.borderActive}` : ''} ${
                                  activeTrackMenuId === String(track.id) ? 'z-40' : 'z-10'
                                }`}
                                style={{
                                  backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.55)), url(${trackCardBg})`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                }}
                              >
                                {isActive && !isPdf && (
                                  <div
                                    className={`absolute top-5 left-5 z-20 flex items-center gap-1 rounded-full ${theme.primaryBg} px-2 py-0.5 text-[9px] font-extrabold ${theme.primaryText} shadow-lg animate-pulse`}
                                  >
                                    <Sparkles className="h-3 w-3 animate-spin" /> Activa
                                  </div>
                                )}

                                <div className="absolute top-3 right-3 z-30">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveTrackMenuId(
                                        activeTrackMenuId === String(track.id)
                                          ? null
                                          : String(track.id)
                                      );
                                    }}
                                    className="flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-zinc-300 hover:text-white backdrop-blur-md cursor-pointer shadow"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </button>

                                  {activeTrackMenuId === String(track.id) && (
                                    <div className="absolute right-0 top-8 z-50 w-48 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-1.5 shadow-2xl">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveTrackMenuId(null);
                                          onOpenPlaylistModal(track);
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white cursor-pointer"
                                      >
                                        <FolderPlus className="h-3.5 w-3.5 shrink-0 text-[#3CC8F5]" />
                                        <span>Agregar a otra carpeta</span>
                                      </button>
                                      <div className="my-1 border-t border-zinc-200 dark:border-zinc-800 pt-1">
                                        <button
                                          type="button"
                                          onClick={(e) => handleRemoveTrackFromCurrentView(track, e)}
                                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer"
                                        >
                                          <Trash2 className="h-3.5 w-3.5 shrink-0" />
                                          <span>
                                            {activeTab === 'favorites'
                                              ? 'Remover de favoritos'
                                              : 'Quitar de esta vista'}
                                          </span>
                                        </button>
                                        <div className="my-1 border-t border-zinc-200 dark:border-zinc-800 pt-1">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveTrackMenuId(null);
                                              setTrackToReport(track);
                                            }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                                          >
                                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                            <span>Reportar contenido</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-900/40 mb-3 flex items-center justify-center">
                                  {isPdf && !track.artworkUrl ? (
                                    <FileText className="h-12 w-12 text-emerald-400" />
                                  ) : (
                                    <img
                                      src={track.artworkUrl || DEFAULT_ARTWORK}
                                      alt={track.title}
                                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                  )}

                                  <div className="absolute top-2 left-2 z-10" {...provided.dragHandleProps}>
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur-md cursor-grab active:cursor-grabbing">
                                      <GripVertical className="h-4 w-4" />
                                    </div>
                                  </div>

                                  <div className="absolute bottom-2 right-2 z-10">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isPdf) {
                                          window.dispatchEvent(
                                            new CustomEvent('open-lecturas-view', { detail: track })
                                          );
                                        } else if (isActive) {
                                          audio?.togglePlayPause();
                                        } else {
                                          audio?.playTrack(track, activeDisplayTracks, {
                                            type: 'folder',
                                            title: breadcrumbs[breadcrumbs.length - 1].name,
                                          });
                                        }
                                      }}
                                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                        isPdf
                                          ? 'bg-emerald-600 text-white'
                                          : `${theme.primaryBg} ${theme.primaryText}`
                                      } shadow-md cursor-pointer hover:scale-105 transition-transform`}
                                    >
                                      {isPdf ? (
                                        <BookOpen className="h-4 w-4" />
                                      ) : isPlaying ? (
                                        <Pause className="h-4 w-4 fill-current" />
                                      ) : (
                                        <Play className="h-4 w-4 fill-current ml-0.5" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-2 mt-1 p-2 rounded-xl bg-black/40 backdrop-blur-md">
                                  <div className="min-w-0 flex-1">
                                    <h4
                                      className={`truncate text-xs sm:text-sm font-bold text-white ${theme.hoverText}`}
                                    >
                                      {track.title}
                                    </h4>
                                    <p className="truncate text-[10px] text-zinc-300 mt-0.5">
                                      {track.artist}
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFavorite(track.id);
                                      setFavoriteIds((prev) => {
                                        const next = new Set(prev);
                                        const idStr = String(track.id);
                                        if (next.has(idStr)) next.delete(idStr);
                                        else next.add(idStr);
                                        return next;
                                      });
                                    }}
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/60 text-white transition-all hover:bg-black cursor-pointer shadow-md"
                                    title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                                  >
                                    <SacredHeartIcon
                                      className={`h-3.5 w-3.5 ${
                                        isFav ? 'text-[#EF4444]' : 'text-zinc-300'
                                      }`}
                                      filled={isFav}
                                    />
                                  </button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              <div className="py-16 text-center text-zinc-500 space-y-2">
                <Music className="mx-auto h-10 w-10 text-zinc-400 dark:text-zinc-700 mb-2" />
                <p className="text-xs">
                  {searchQuery.trim()
                    ? `No se encontraron resultados para "${searchQuery.trim()}" en ${activeCategoryHeading}.`
                    : 'No hay pistas o documentos en esta carpeta o categoría.'}
                </p>
                {(searchQuery.trim() || currentSortMode !== 'default') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentSortMode('default');
                    }}
                    className="text-xs font-bold text-[#3CC8F5] underline cursor-pointer"
                  >
                    Restablecer búsqueda y orden
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL DE REPORTE */}
      {trackToReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214] p-6 shadow-2xl space-y-4 my-auto text-zinc-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Reportar Contenido
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTrackToReport(null)}
                className="rounded-lg p-1 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {reportSuccessMessage ? (
              <div className="py-8 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  ✓
                </div>
                <p className="text-sm font-bold text-zinc-900 dark:text-white">
                  {reportSuccessMessage}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendReport} className="space-y-4">
                <div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">
                    Estás reportando el elemento:{' '}
                    <span className="text-zinc-900 dark:text-white font-semibold">
                      {trackToReport.title}
                    </span>
                  </p>
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1 block">
                    Motivo del reporte
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white outline-none focus:border-amber-500"
                  >
                    <option value="Derechos de autor / Copyright">
                      Derechos de autor / Copyright
                    </option>
                    <option value="Contenido inapropiado u ofensivo">
                      Contenido inapropiado u ofensivo
                    </option>
                    <option value="Audio defectuoso o archivo dañado">
                      Audio defectuoso o archivo dañado
                    </option>
                    <option value="Información incorrecta o errónea">
                      Información incorrecta o errónea
                    </option>
                    <option value="Otro motivo">Otro motivo</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1 block">
                    Descripción adicional (Opcional)
                  </label>
                  <textarea
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Proporciona detalles que ayuden a revisar este contenido..."
                    rows={3}
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setTrackToReport(null)}
                    className="rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-black hover:bg-amber-400 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingReport ? 'Enviando...' : 'Enviar Reporte'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showConfirmModal && folderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214] p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-white">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              ¿Eliminar carpeta?
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Estás a punto de eliminar{' '}
              <span className="text-zinc-900 dark:text-white font-semibold">
                "{folderToDelete.name}"
              </span>
              . Las pistas dentro de ella no se eliminarán, pero la estructura de carpetas se
              perderá.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteFolder}
                className="rounded-xl bg-red-500 px-4 py-2 text-xs font-bold text-white hover:bg-red-600 cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {folderToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleConfirmEditFolder}
            className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214] p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-white"
          >
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Editar Carpeta</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1 block">
                  Nombre de la carpeta
                </label>
                <input
                  type="text"
                  value={editedFolderName}
                  onChange={(e) => setEditedFolderName(e.target.value)}
                  className={`w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white outline-none focus:${theme.borderActive}`}
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1 block">
                  Color identificador
                </label>
                <input
                  type="color"
                  value={editedFolderColor}
                  onChange={(e) => setEditedFolderColor(e.target.value)}
                  className="h-10 w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-transparent cursor-pointer"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFolderToEdit(null)}
                className="rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`rounded-xl ${theme.primaryBg} px-4 py-2 text-xs font-bold ${theme.primaryText} border ${theme.borderActive} hover:opacity-90 cursor-pointer`}
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}