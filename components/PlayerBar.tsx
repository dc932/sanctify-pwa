import { useRef, type PointerEvent } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music,
  Mic,
  BookOpen,
  Shuffle,
  Repeat,
} from 'lucide-react';
import { useAudio } from '@/context/AudioContext';
import type { TrackCategory } from '@/types/audio';

const categoryIcon: Record<TrackCategory, typeof Music> = {
  music: Music,
  podcast: Mic,
  blog: BookOpen,
  video: Music,
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    position,
    duration,
    progressPercentage,
    isShuffle,
    repeatMode,
    togglePlayPause,
    seekTo,
    skipToNext,
    skipToPrevious,
    toggleShuffle,
    toggleRepeat,
  } = useAudio();

  const barRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const seekFromEvent = (clientX: number) => {
    const bar = barRef.current;
    if (!bar || duration <= 0) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    seekTo(pct * duration);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekFromEvent(e.clientX);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    seekFromEvent(e.clientX);
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  if (!currentTrack) {
    return (
      <div className="border-t border-zinc-800 bg-[#121214]/90 px-6 py-4 backdrop-blur-md">
        <p className="text-center text-xs text-zinc-500">
          Selecciona una pista para comenzar a escuchar
        </p>
      </div>
    );
  }

  const CatIcon = categoryIcon[currentTrack.category] || Music;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800 bg-[#121214]/95 shadow-2xl backdrop-blur-xl text-white">
      {/* Barra de progreso interactiva (Seekbar) */}
      <div
        ref={barRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="group relative h-1.5 cursor-pointer bg-zinc-800"
      >
        <div
          className="absolute inset-y-0 left-0 bg-[#3CC8F5] transition-[width] duration-150 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3CC8F5] opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100"
          style={{ left: `${progressPercentage}%` }}
        />
      </div>

      <div className="flex items-center gap-4 px-4 py-3 sm:px-6">
        {/* Información de la pista actual */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <img
            src={currentTrack.artworkUrl || 'https://images.pexels.com/photos/426976/pexels-photo-426976.jpeg?auto=compress&cs=tinysrgb&w=600'}
            alt={currentTrack.title}
            className="h-11 w-11 shrink-0 rounded-xl object-cover shadow-sm border border-zinc-800"
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-white">
              {currentTrack.title}
            </p>
            <p className="truncate text-[11px] text-zinc-400">
              {currentTrack.artist}
            </p>
          </div>
          <span className="hidden shrink-0 items-center gap-1 rounded-full bg-[#3CC8F5]/10 px-2.5 py-1 text-[10px] font-medium text-[#3CC8F5] sm:flex">
            <CatIcon className="h-3 w-3" />
            {currentTrack.category}
          </span>
        </div>

        {/* Controles del Reproductor (Shuffle, Prev, Play/Pause, Next, Repeat) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Botón Aleatorio / Shuffle */}
          <button
            onClick={toggleShuffle}
            className={`transition-colors p-2 rounded-full hover:bg-zinc-800 ${
              isShuffle ? 'text-[#3CC8F5]' : 'text-zinc-400 hover:text-white'
            }`}
            title="Modo aleatorio"
            aria-label="Activar modo aleatorio"
          >
            <Shuffle className="h-4 w-4" />
          </button>

          {/* Pista anterior */}
          <button
            onClick={skipToPrevious}
            className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            aria-label="Anterior"
          >
            <SkipBack className="h-4 w-4" fill="currentColor" />
          </button>

          {/* Play / Pause limpio (utiliza la lógica robusta del AudioContext) */}
          <button
            onClick={togglePlayPause}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3CC8F5] text-black shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer select-none touch-manipulation"
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 fill-black" />
            ) : (
              <Play className="ml-0.5 h-4 w-4 fill-black" />
            )}
          </button>

          {/* Pista siguiente */}
          <button
            onClick={skipToNext}
            className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            aria-label="Siguiente"
          >
            <SkipForward className="h-4 w-4" fill="currentColor" />
          </button>

          {/* Botón Repetir / Repeat */}
          <button
            onClick={toggleRepeat}
            className={`relative transition-colors p-2 rounded-full hover:bg-zinc-800 ${
              repeatMode !== 'off' ? 'text-[#3CC8F5]' : 'text-zinc-400 hover:text-white'
            }`}
            title={`Repetir: ${repeatMode}`}
            aria-label="Modo repetición"
          >
            <Repeat className="h-4 w-4" />
            {repeatMode === 'one' && (
              <span className="absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-[#3CC8F5] text-[8px] font-extrabold text-black">
                1
              </span>
            )}
          </button>
        </div>

        {/* Tiempo de reproducción actual / Duración */}
        <div className="hidden w-28 shrink-0 items-center justify-end gap-1 text-xs tabular-nums text-zinc-400 md:flex">
          <span>{formatTime(position)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}