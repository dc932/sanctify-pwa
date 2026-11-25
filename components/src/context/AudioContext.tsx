import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Track, AudioState } from '@/types/audio';
import { supabase } from '../supabase';
import { getProxiedAudioUrl } from '@/lib/audioUtils';

export interface AudioContextValue extends AudioState {
  queue: Track[];
  originalQueue: Track[];
  currentIndex: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  isLoadingAudio: boolean;
  playbackRate: number;
  volume: number;
  playbackSource: {
    type: 'playlist' | 'album' | 'category' | 'queue' | 'folder' | 'favorites';
    title: string;
  };
  scheduledNextId: string | null;
  scheduleNext: (trackId: string | null) => void;
  isFullScreenOpen: boolean;
  openFullScreen: () => void;
  closeFullScreen: () => void;
  playTrack: (
    track: Track,
    newQueue?: Track[],
    source?: AudioContextValue['playbackSource']
  ) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  togglePlayPause: () => void;
  pausePlayback: () => void;
  seekTo: (seconds: number) => void;
  skipToNext: () => void;
  skipToPrevious: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setPlaybackSpeed: (speed: number) => void;
  setVolumeLevel: (level: number) => void;
  audioElement: HTMLAudioElement | null;
  frequencyData: Uint8Array;
  favorites: Set<string>;
  toggleFavorite: (trackId: string) => Promise<void>;
  loadingFavorite: boolean;
  // Propiedades normalizadas para transcripts y letras en móvil y web
  currentLyrics: string;
  currentTranscript: string;
}

export const AudioContext = createContext<AudioContextValue | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'sanctify_player_state';

const formatState = (
  track: Track | null,
  isPlaying: boolean,
  position: number,
  duration: number
): AudioState => ({
  currentTrack: track,
  isPlaying,
  position,
  duration,
  progressPercentage: duration > 0 ? (position / duration) * 100 : 0,
});

export function AudioProvider({
  children,
  queue: initialQueue,
  session,
}: {
  children: ReactNode;
  queue: Track[];
  session?: any;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const [queue, setQueue] = useState<Track[]>(initialQueue);
  const [originalQueue, setOriginalQueue] = useState<Track[]>(initialQueue);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [playbackSource, setPlaybackSource] = useState<AudioContextValue['playbackSource']>({
    type: 'queue',
    title: 'Tu fila de reproducción',
  });

  const [scheduledNextId, setScheduledNextId] = useState<string | null>(null);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(0));

  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loadingFavorite, setLoadingFavorite] = useState(false);

  useEffect(() => {
    async function fetchUserFavorites() {
      const userId = session?.user?.id;
      if (!userId) {
        setFavorites(new Set());
        return;
      }
      try {
        const { data, error } = await supabase
          .from('favorites')
          .select('track_id')
          .eq('user_id', userId);

        if (!error && data) {
          setFavorites(new Set(data.map((fav: any) => fav.track_id)));
        }
      } catch (err) {
        console.error('Error al cargar favoritos globales:', err);
      }
    }

    fetchUserFavorites();
  }, [session?.user?.id]);

  const toggleFavorite = useCallback(
    async (trackId: string) => {
      const userId = session?.user?.id;
      if (!userId || loadingFavorite) return;

      setLoadingFavorite(true);
      const isCurrentlyFavorite = favorites.has(trackId);

      setFavorites((prev) => {
        const next = new Set(prev);
        if (isCurrentlyFavorite) {
          next.delete(trackId);
        } else {
          next.add(trackId);
        }
        return next;
      });

      try {
        if (isCurrentlyFavorite) {
          const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', userId)
            .eq('track_id', trackId);

          if (error) throw error;
        } else {
          const { error } = await supabase.from('favorites').insert({
            user_id: userId,
            track_id: trackId,
          });

          if (error) throw error;
        }
      } catch (err) {
        console.error('Error al actualizar favorito global:', err);
        setFavorites((prev) => {
          const next = new Set(prev);
          if (isCurrentlyFavorite) {
            next.add(trackId);
          } else {
            next.delete(trackId);
          }
          return next;
        });
      } finally {
        setLoadingFavorite(false);
      }
    },
    [session?.user?.id, favorites, loadingFavorite]
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.isShuffle !== undefined) setIsShuffle(parsed.isShuffle);
        if (parsed.repeatMode) setRepeatMode(parsed.repeatMode);
        if (parsed.playbackRate) setPlaybackRate(parsed.playbackRate);
        if (parsed.volume !== undefined) setVolume(parsed.volume);
      }
    } catch (e) {
      console.warn('Error leyendo localStorage:', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({ isShuffle, repeatMode, playbackRate, volume })
      );
    } catch (e) {
      console.warn('Error guardando en localStorage:', e);
    }
  }, [isShuffle, repeatMode, playbackRate, volume]);

  useEffect(() => {
    if (!isShuffle && initialQueue.length > 0) {
      setQueue(initialQueue);
      setOriginalQueue(initialQueue);
    }
  }, [initialQueue, isShuffle]);

  const unlockAudioOnTouch = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.load();
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    window.removeEventListener('touchstart', unlockAudioOnTouch);
    window.removeEventListener('click', unlockAudioOnTouch);
  }, []);

  useEffect(() => {
    window.addEventListener('touchstart', unlockAudioOnTouch, { once: true });
    window.addEventListener('click', unlockAudioOnTouch, { once: true });

    return () => {
      window.removeEventListener('touchstart', unlockAudioOnTouch);
      window.removeEventListener('click', unlockAudioOnTouch);
    };
  }, [unlockAudioOnTouch]);

  const skipToNextRef = useRef<() => void>(() => {});

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';

    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.setAttribute('x5-playsinline', 'true');

    audioRef.current = audio;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (!isMobile) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioCtxRef.current = audioCtx;

          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.8;
          analyserRef.current = analyser;

          const source = audioCtx.createMediaElementSource(audio);
          source.connect(analyser);
          analyser.connect(audioCtx.destination);
        }
      } catch (err) {
        console.warn('Web Audio API omitida o no soportada:', err);
      }
    }

    const onTimeUpdate = () => setPosition(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onPlay = () => {
      setIsPlaying(true);
      setIsLoadingAudio(false);
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    };
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsLoadingAudio(true);
    const onPlaying = () => setIsLoadingAudio(false);
    const onCanPlay = () => setIsLoadingAudio(false);
    const onEnded = () => skipToNextRef.current();

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    const analyser = analyserRef.current;

    const updateFrequency = () => {
      if (analyser && isPlaying) {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        setFrequencyData(new Uint8Array(dataArray));
        animationFrameId = requestAnimationFrame(updateFrequency);
      } else {
        setFrequencyData(new Uint8Array(0));
      }
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(updateFrequency);
    } else {
      setFrequencyData(new Uint8Array(0));
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying]);

  const currentTrack = currentIndex >= 0 ? queue[currentIndex] ?? null : null;

  const currentLyrics = currentTrack
    ? (currentTrack as any).lyrics || (currentTrack as any).content || ''
    : '';
  const currentTranscript = currentTrack
    ? (currentTrack as any).transcript || (currentTrack as any).description || ''
    : '';

  const updateMediaSession = useCallback((track: Track) => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: 'Sanctify',
      artwork: [
        { src: track.artworkUrl, sizes: '512x512', type: 'image/jpeg' },
      ],
    });
  }, []);

  const loadTrack = useCallback(
    async (track: Track) => {
      const audio = audioRef.current;
      if (!audio) return;
      
      const rawUrl = track.audioUrl || (track as any).file_url || (track as any).url;
      const audioSourceUrl = getProxiedAudioUrl(rawUrl);
      if (!audioSourceUrl) {
        console.warn('La pista no cuenta con una URL de audio válida:', track);
        return;
      }

      setIsLoadingAudio(true);
      
      try {
        audio.pause();
        audio.src = '';
        audio.src = audioSourceUrl;
        audio.crossOrigin = 'anonymous';
        audio.playbackRate = playbackRate;
        audio.volume = volume;
        audio.load();
        
        updateMediaSession(track);
      } catch (err) {
        console.warn('Error al cargar la pista de audio:', err);
        setIsLoadingAudio(false);
      }
    },
    [updateMediaSession, playbackRate, volume]
  );

  const playTrack = useCallback(
    async (
      track: Track,
      newQueue?: Track[],
      source?: AudioContextValue['playbackSource']
    ) => {
      if (!track) return;

      const fileUrl = (track.file_url || track.audio_url || track.url || '').toLowerCase();
      const category = (track.category || '').toLowerCase();
      const title = (track.title || '').toLowerCase();

      const isPdf = 
        fileUrl.includes('.pdf') || 
        category === 'blog' || 
        category === 'reading' || 
        category === 'lecturas' ||
        title.includes('.pdf');

      if (isPdf) {
        setIsPlaying(false);
        setIsLoadingAudio(false);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
        return;
      }

      const audio = audioRef.current;
      if (!audio) return;

      let activeQueue = queue;
      setPlaybackSource(
        source ?? {
          type: 'category',
          title: track.category || 'Reproducción',
        }
      );
      if (newQueue && newQueue.length > 0) {
        activeQueue = newQueue;
        setOriginalQueue(newQueue);
        if (isShuffle) {
          const current = track;
          const otherTracks = newQueue.filter((t) => t.id !== current.id);
          const shuffledOthers = [...otherTracks].sort(() => Math.random() - 0.5);
          activeQueue = [current, ...shuffledOthers];
          setQueue(activeQueue);
        } else {
          setQueue(newQueue);
        }
      }

      const idx = activeQueue.findIndex((t) => t.id === track.id);
      if (idx === -1) return;

      setScheduledNextId(null);
      setCurrentIndex(idx);
      await loadTrack(track);

      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      try {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          setIsPlaying(true);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.warn('Error al reproducir audio:', error);
        }
        setIsPlaying(false);
        setIsLoadingAudio(false);
      }
    },
    [queue, isShuffle, loadTrack]
  );

  const openFullScreen = useCallback(() => setIsFullScreenOpen(true), []);
  const closeFullScreen = useCallback(() => setIsFullScreenOpen(false), []);

  const scheduleNext = useCallback((trackId: string | null) => {
    setScheduledNextId(trackId);
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => [...prev, track]);
    setOriginalQueue((prev) => [...prev, track]);
  }, []);

  const removeFromQueue = useCallback((trackId: string) => {
    setQueue((prev) => prev.filter((t) => t.id !== trackId));
    setOriginalQueue((prev) => prev.filter((t) => t.id !== trackId));
  }, []);

  const togglePlayPause = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;

    try {
      if (audio.paused) {
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          setIsPlaying(true);
        }
      } else {
        audio.pause();
        setIsPlaying(false);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.warn('Error al alternar reproducción:', error);
      }
      setIsPlaying(false);
    }
  }, []);

  const pausePlayback = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || 0));
    setPosition(audio.currentTime);
  }, []);

  const skipToNext = useCallback(async () => {
    if (queue.length === 0) return;

    if (repeatMode === 'one' && audioRef.current) {
      audioRef.current.currentTime = 0;
      try {
        await audioRef.current.play();
      } catch (e: any) {
        if (e.name !== 'AbortError') console.warn(e);
      }
      return;
    }

    const scheduledIdx = scheduledNextId
      ? queue.findIndex((t) => t.id === scheduledNextId)
      : -1;
    setScheduledNextId(null);

    setCurrentIndex((prev) => {
      if (prev < 0) return 0;
      const nextIdx = scheduledIdx !== -1 ? scheduledIdx : prev + 1;

      if (nextIdx >= queue.length) {
        if (repeatMode === 'off') {
          setIsPlaying(false);
          audioRef.current?.pause();
          return prev;
        }
        const firstIdx = 0;
        loadTrack(queue[firstIdx]).then(() => {
          audioRef.current?.play().catch((err) => {
            if (err.name !== 'AbortError') console.warn(err);
          });
        });
        return firstIdx;
      }

      loadTrack(queue[nextIdx]).then(() => {
        audioRef.current?.play().catch((err) => {
          if (err.name !== 'AbortError') console.warn(err);
        });
      });
      return nextIdx;
    });
  }, [queue, repeatMode, loadTrack, scheduledNextId]);

  skipToNextRef.current = skipToNext;

  const skipToPrevious = useCallback(() => {
    if (queue.length === 0) return;

    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    setCurrentIndex((prev) => {
      if (prev < 0) return 0;
      const prevIdx = prev - 1 < 0 ? queue.length - 1 : prev - 1;
      loadTrack(queue[prevIdx]).then(() => {
        audioRef.current?.play().catch((err) => {
          if (err.name !== 'AbortError') console.warn(err);
        });
      });
      return prevIdx;
    });
  }, [queue, loadTrack]);

  const toggleShuffle = useCallback(() => {
    const current = currentTrack;
    if (!isShuffle) {
      setIsShuffle(true);
      if (queue.length <= 1) return;

      const otherTracks = queue.filter((t) => t.id !== current?.id);
      const shuffledOthers = [...otherTracks].sort(() => Math.random() - 0.5);
      const newQueue = current ? [current, ...shuffledOthers] : shuffledOthers;

      setQueue(newQueue);
      setCurrentIndex(current ? 0 : -1);
    } else {
      setIsShuffle(false);
      setQueue(originalQueue);
      if (current) {
        const origIdx = originalQueue.findIndex((t) => t.id === current.id);
        setCurrentIndex(origIdx !== -1 ? origIdx : 0);
      }
    }
  }, [isShuffle, queue, originalQueue, currentTrack]);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, []);

  const setVolumeLevel = useCallback((level: number) => {
    const clamped = Math.max(0, Math.min(1, level));
    setVolume(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (audioRef.current) seekTo(audioRef.current.currentTime + 5);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (audioRef.current) seekTo(audioRef.current.currentTime - 5);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, seekTo]);

  const value: AudioContextValue = {
    ...formatState(currentTrack, isPlaying, position, duration),
    queue,
    originalQueue,
    currentIndex,
    isShuffle,
    repeatMode,
    isLoadingAudio,
    playbackRate,
    volume,
    playbackSource,
    scheduledNextId,
    scheduleNext,
    isFullScreenOpen,
    openFullScreen,
    closeFullScreen,
    playTrack,
    addToQueue,
    removeFromQueue,
    togglePlayPause,
    pausePlayback,
    seekTo,
    skipToNext,
    skipToPrevious,
    toggleShuffle,
    toggleRepeat,
    setPlaybackSpeed,
    setVolumeLevel,
    audioElement: audioRef.current,
    frequencyData,
    favorites,
    toggleFavorite,
    loadingFavorite,
    currentLyrics,
    currentTranscript,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio(): AudioContextValue {
  const ctx = useContext(AudioContext);
  if (ctx === undefined) {
    throw new Error('useAudio debe usarse dentro de un AudioProvider');
  }
  return ctx;
}