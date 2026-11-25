import { SacredHeartIcon } from '@/components/SacredHeartIcon';
import { useState, useRef, useCallback, useEffect, type PointerEvent } from 'react';
import {
  ChevronDown,
  MoreVertical,
  ListMusic,
  Info,
  Music,
} from 'lucide-react';
import { useAudio } from '@/context/AudioContext';
import type { Track } from '@/types/audio';
import { QueueTab } from './player/QueueTab';
import { ArtistInfoTab } from './player/ArtistInfoTab';
import { PlayerControls } from './player/PlayerControls';
import { ProgressBarExtras } from './player/ProgressBarExtras';
import { LyricsCard } from './player/LyricsCard';
import { UpNextPanel } from './player/UpNextPanel';
import { getProxiedAudioUrl } from '@/lib/audioUtils';

interface FullScreenPlayerProps {
  onClose: () => void;
  onOpenPlaylistModal: (track: Track) => void;
  session?: any;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Componente visualizador de ondas dinámicas (Audiograma)
function AudioVisualizer({
  frequencyData,
  isPlaying,
  barColor = '#3CC8F5',
  barCount = 18,
}: {
  frequencyData: Uint8Array;
  isPlaying: boolean;
  barColor?: string;
  barCount?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (!isPlaying || frequencyData.length === 0) {
      const barWidth = width / barCount - 3;
      for (let i = 0; i < barCount; i++) {
        ctx.fillStyle = barColor;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(i * (barWidth + 3), height - 4, barWidth, 4);
      }
      return;
    }

    const barWidth = width / barCount - 3;
    ctx.globalAlpha = 1;

    for (let i = 0; i < barCount; i++) {
      const value = frequencyData[i] || 0;
      const percent = value / 255;
      const barHeight = Math.max(6, percent * height);

      const x = i * (barWidth + 3);
      const y = height - barHeight;

      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, barColor);
      gradient.addColorStop(1, '#93C5FD');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
      } else {
        ctx.rect(x, y, barWidth, barHeight);
      }
      ctx.fill();
    }
  }, [frequencyData, isPlaying, barColor, barCount]);

  return (
    <div className="flex items-center justify-center w-full h-full">
      <canvas ref={canvasRef} width={220} height={60} className="w-full h-full max-w-[220px] max-h-[60px]" />
    </div>
  );
}

export default function FullScreenPlayer({
  onClose,
  onOpenPlaylistModal,
}: FullScreenPlayerProps) {
  const {
    currentTrack,
    isPlaying,
    position,
    duration,
    isShuffle,
    repeatMode,
    queue,
    currentIndex,
    playbackRate,
    volume,
    playbackSource,
    favorites,
    toggleFavorite,
    togglePlayPause,
    seekTo,
    skipToNext,
    skipToPrevious,
    toggleShuffle,
    toggleRepeat,
    playTrack,
    removeFromQueue,
    setPlaybackSpeed,
    setVolumeLevel,
    frequencyData,
  } = useAudio() as any;

  const [activeTab, setActiveTab] = useState<'player' | 'queue' | 'info'>('player');
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const seekFromEvent = useCallback(
    (clientX: number) => {
      const bar = barRef.current;
      if (!bar || duration <= 0) return;
      const rect = bar.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      seekTo(pct * duration);
    },
    [duration, seekTo]
  );

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

  if (!currentTrack) return null;

  const safeAudioUrl = getProxiedAudioUrl(currentTrack.file_url || currentTrack.url);
  console.debug('Reproduciendo pista con URL optimizada:', safeAudioUrl);

  const isFavorite = favorites.has(currentTrack.id);
  const progressPct = duration > 0 ? (position / duration) * 100 : 0;

  // Manejador protegido para cerrar el reproductor al primer clic
  const handleClosePlayer = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-gradient-to-b from-zinc-900 via-[#0A0A0B] to-black px-4 sm:px-6 py-6 sm:py-8 text-white animate-in fade-in slide-in-from-bottom duration-300">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleClosePlayer}
          className="relative z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 cursor-pointer shadow-lg active:scale-95"
          title="Minimizar reproductor"
        >
          <ChevronDown className="h-6 w-6 pointer-events-none" />
        </button>

        <div className="flex gap-1 bg-zinc-900/90 p-1 rounded-full border border-zinc-800 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('player')}
            className={`px-3 py-1.5 sm:px-3.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'player'
                ? 'bg-[#3CC8F5] text-black shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Reproductor"
          >
            <Music className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Reproductor</span>
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1.5 sm:px-3.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'queue'
                ? 'bg-[#3CC8F5] text-black shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
            title={`En fila (${queue.length})`}
          >
            <ListMusic className="h-3.5 w-3.5 shrink-0" />
            <span>En fila <span className="text-[10px] opacity-80">({queue.length})</span></span>
          </button>

          <button
            onClick={() => setActiveTab('info')}
            className={`px-3 py-1.5 sm:px-3.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'info'
                ? 'bg-[#3CC8F5] text-black shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Artista"
          >
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Artista</span>
          </button>
        </div>

        <button
          onClick={() => onOpenPlaylistModal(currentTrack)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 hover:text-[#3CC8F5] cursor-pointer"
          title="Opciones / Lista"
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>

      {/* Contenido dinámico */}
      <div className="flex-1 overflow-y-auto px-2 py-4 sm:py-6 max-w-md mx-auto w-full flex flex-col justify-center scrollbar-hide">
        {activeTab === 'player' && (
          <div className="flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300 w-full">
            <button
              type="button"
              onClick={handleClosePlayer}
              className="mb-1 flex max-w-full flex-col items-center rounded-xl px-4 py-1 text-center transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3CC8F5] cursor-pointer"
              title="Volver a la fuente de reproducción"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Reproduciendo de {playbackSource?.type || 'Álbum / Catálogo'}
              </span>
              <span className="max-w-full truncate text-base font-bold text-white sm:text-lg">
                {playbackSource?.title || currentTrack.albumName || 'Sanctify'}
              </span>
            </button>

            {/* Contenedor de la Portada con Audiograma Superpuesto */}
            <div className="relative aspect-square w-full max-w-[240px] sm:max-w-[280px] overflow-hidden rounded-3xl shadow-2xl shadow-black/80 border border-white/10 group">
              <img
                src={currentTrack.artworkUrl}
                alt={currentTrack.title}
                className="h-full w-full object-cover"
              />

              {/* Overlay con Audiograma Activo en Vivo */}
              {isPlaying && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 flex flex-col items-center justify-center p-4">
                  <div className="w-full h-16 flex items-center justify-center">
                    <AudioVisualizer frequencyData={frequencyData} isPlaying={isPlaying} barColor="#3CC8F5" barCount={18} />
                  </div>
                  <span className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[#3CC8F5] animate-pulse">
                    Reproduciendo en vivo
                  </span>
                </div>
              )}
            </div>

            <div className="w-full">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 text-left">
                  <h1 className="truncate text-xl font-extrabold leading-tight text-white sm:text-2xl">
                    {currentTrack.title}
                  </h1>
                  <p className="truncate text-sm font-medium text-zinc-400 mt-0.5">
                    {currentTrack.artist}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(currentTrack.id);
                  }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:text-[#3CC8F5] cursor-pointer"
                  title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                >
                  <SacredHeartIcon
                    className={`h-6 w-6 transition-transform ${isFavorite ? 'scale-110 text-[#EF4444]' : 'text-zinc-400 hover:text-white'}`}
                    filled={isFavorite}
                  />
                </button>
              </div>

              {/* Barra de progreso */}
              <div className="mt-4 space-y-1.5">
                <div
                  ref={barRef}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  className="group relative h-2 w-full cursor-pointer rounded-full bg-zinc-800 touch-none"
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-[#3CC8F5] transition-[width] duration-150 ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                  <div
                    className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3CC8F5] opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
                    style={{ left: `${progressPct}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs font-semibold tabular-nums text-zinc-400">
                  <span>{formatTime(position)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controles de reproducción con manejo nativo independiente */}
              <div className="w-full">
                <PlayerControls
                  isPlaying={isPlaying}
                  isShuffle={isShuffle}
                  repeatMode={repeatMode}
                  onTogglePlay={togglePlayPause}
                  onPrev={skipToPrevious}
                  onNext={skipToNext}
                  onToggleShuffle={toggleShuffle}
                  onToggleRepeat={toggleRepeat}
                />
              </div>

              <ProgressBarExtras
                volume={volume}
                playbackRate={playbackRate}
                showSpeedMenu={showSpeedMenu}
                onToggleSpeedMenu={() => setShowSpeedMenu((p) => !p)}
                onSelectSpeed={(rate) => {
                  setPlaybackSpeed(rate);
                  setShowSpeedMenu(false);
                }}
                onVolumeChange={setVolumeLevel}
              />

              <LyricsCard track={currentTrack} />
            </div>
          </div>
        )}

        {activeTab === 'queue' && (
          <QueueTab
            queue={queue}
            currentIndex={currentIndex}
            onPlay={playTrack}
            onRemove={removeFromQueue}
          />
        )}

        {activeTab === 'info' && <ArtistInfoTab track={currentTrack} />}
      </div>

      <UpNextPanel />
    </div>
  );
}