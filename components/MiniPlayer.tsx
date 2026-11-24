import { SacredHeartIcon } from '@/components/SacredHeartIcon';
import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Maximize2,
  Minimize2,
  MoreVertical,
  Loader2,
  ListMusic,
} from 'lucide-react';
import { useAudio } from '@/context/AudioContext';
import FullScreenPlayer from './FullScreenPlayer';

interface MiniPlayerProps {
  session: any;
  onOpenPlaylistModal: (track: any) => void;
  isVideoFullscreen?: boolean;
}

// Hook personalizado para el análisis de audio en tiempo real
function useAudioAnalyser(audioElement: HTMLAudioElement | null, isPlaying: boolean) {
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(0));
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!audioElement) return;

    audioElement.crossOrigin = 'anonymous';

    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (typeof AudioContextClass !== 'function') return;

      try {
        audioCtxRef.current = new AudioContextClass();
        analyserRef.current = audioCtxRef.current.createAnalyser();
        analyserRef.current.fftSize = 64;
        analyserRef.current.smoothingTimeConstant = 0.8;
        sourceRef.current = audioCtxRef.current.createMediaElementSource(audioElement);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioCtxRef.current.destination);
      } catch {
        audioCtxRef.current = null;
        analyserRef.current = null;
        sourceRef.current = null;
      }
    }

    if (audioCtxRef.current.state === 'suspended' && isPlaying) {
      audioCtxRef.current.resume();
    }
  }, [audioElement, isPlaying]);

  useEffect(() => {
    if (!analyserRef.current || !isPlaying) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateAnalyser = () => {
      if (analyserRef.current && isPlaying) {
        analyserRef.current.getByteFrequencyData(dataArray);
        setFrequencyData(new Uint8Array(dataArray));
        animationFrameRef.current = requestAnimationFrame(updateAnalyser);
      }
    };

    updateAnalyser();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  return frequencyData;
}

// Componente visualizador de ondas dinámicas (Audiograma)
function AudioVisualizer({
  frequencyData,
  isPlaying,
  barColor = '#3CC8F5',
  barCount = 10,
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
      const barWidth = width / barCount - 2;
      for (let i = 0; i < barCount; i++) {
        ctx.fillStyle = barColor;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(i * (barWidth + 2), height - 3, barWidth, 3);
      }
      return;
    }

    const barWidth = width / barCount - 2;
    ctx.globalAlpha = 1;

    for (let i = 0; i < barCount; i++) {
      const value = frequencyData[i] || 0;
      const percent = value / 255;
      const barHeight = Math.max(3, percent * height);

      const x = i * (barWidth + 2);
      const y = height - barHeight;

      ctx.fillStyle = barColor;
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }, [frequencyData, isPlaying, barColor, barCount]);

  return (
    <div className="flex items-center justify-center w-full h-full">
      <canvas ref={canvasRef} width={100} height={32} className="w-full h-full" />
    </div>
  );
}

export default function MiniPlayer({
  session,
  onOpenPlaylistModal,
  isVideoFullscreen = false,
}: MiniPlayerProps) {
  const {
    currentTrack,
    isPlaying,
    progressPercentage,
    isShuffle,
    repeatMode,
    isLoadingAudio,
    queue,
    togglePlayPause,
    skipToNext,
    skipToPrevious,
    toggleShuffle,
    toggleRepeat,
    openFullScreen,
    isFullScreenOpen,
    closeFullScreen,
    favorites,
    toggleFavorite,
    audioElement,
  } = useAudio() as any;

  const [showQueuePopover, setShowQueuePopover] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Obtener frecuencias para el audiograma en vivo
  const frequencyData = useAudioAnalyser(audioElement || null, isPlaying);

  const isFavorite = currentTrack ? favorites.has(currentTrack.id) : false;

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentTrack || !session?.user) return;

    try {
      await toggleFavorite(currentTrack.id);
    } catch (err) {
      console.error('Error al actualizar favoritos desde el miniplayer:', err);
    }
  };

  if (!currentTrack) return null;

  const fullScreen = isFullScreenOpen ? (
    <FullScreenPlayer
      onClose={closeFullScreen}
      onOpenPlaylistModal={onOpenPlaylistModal}
      session={session}
    />
  ) : null;

  if (isVideoFullscreen) return fullScreen;

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 64 || info.velocity.y > 500) setIsMinimized(true);
  };

  return (
    <>
      <AnimatePresence initial={false} mode="wait">
        {isMinimized ? (
          <motion.button
            key="minimized-player"
            type="button"
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            onClick={() => setIsMinimized(false)}
            className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full border border-zinc-200 bg-white/95 p-2 pr-4 text-left shadow-2xl backdrop-blur-xl dark:border-zinc-800 dark:bg-[#121214]/95 cursor-pointer"
            aria-label="Restaurar reproductor"
          >
            <img
              src={currentTrack.artworkUrl || 'https://images.pexels.com/photos/426976/pexels-photo-426976.jpeg?auto=compress&cs=tinysrgb&w=600'}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
            <span className="max-w-32 truncate text-xs font-bold text-zinc-900 dark:text-white">{currentTrack.title}</span>
            <Play className="h-4 w-4 fill-[#3CC8F5] text-[#3CC8F5]" />
          </motion.button>
        ) : (
          <motion.div
            key="expanded-player"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 120 }}
            dragElastic={0.18}
            onDragEnd={handleDragEnd}
            className="fixed bottom-[60px] sm:bottom-[64px] left-0 right-0 z-40 border-t border-zinc-200 dark:border-zinc-800/80 bg-white/95 dark:bg-[#0A0A0B]/95 backdrop-blur-xl shadow-2xl transition-all duration-200"
          >
            {/* Barra de progreso sutil superior */}
            <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full bg-[#3CC8F5] transition-[width] duration-200 ease-linear"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2 sm:px-6">
              {/* Información del Track (Única zona que abre pantalla completa) */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  openFullScreen();
                }}
                className="flex flex-1 cursor-pointer items-center gap-3 min-w-0 mr-2 group/info"
                title="Abrir pantalla completa"
              >
                <div className="relative h-11 w-11 shrink-0 rounded-xl overflow-hidden shadow-sm">
                  <img
                    src={
                      currentTrack.artworkUrl ||
                      'https://images.pexels.com/photos/426976/pexels-photo-426976.jpeg?auto=compress&cs=tinysrgb&w=600'
                    }
                    alt={currentTrack.title}
                    className="h-full w-full object-cover"
                  />
                  {isPlaying && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-1">
                      <AudioVisualizer frequencyData={frequencyData} isPlaying={isPlaying} barColor="#3CC8F5" barCount={10} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-zinc-900 dark:text-white sm:text-sm group-hover/info:text-[#3CC8F5] transition-colors">
                    {currentTrack.title}
                  </p>
                  <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                    {currentTrack.artist}
                  </p>
                </div>
              </div>

              {/* Controles Principales (Con stopPropagation para evitar abrir pantalla completa) */}
              <div className="flex items-center gap-1 sm:gap-3" onClick={(e) => e.stopPropagation()}>
                {/* Botón Favoritos */}
                <button
                  onClick={handleToggleFavorite}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:text-[#3CC8F5] cursor-pointer"
                  title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                >
                  <SacredHeartIcon 
                    className={`h-5 w-5 transition-transform ${isFavorite ? 'scale-110 text-[#EF4444]' : 'text-zinc-400 hover:text-white'}`} 
                    filled={isFavorite} 
                  />
                </button>

                {/* Aleatorio */}
                <button
                  onClick={toggleShuffle}
                  className={`hidden sm:flex p-2 rounded-full transition-colors cursor-pointer ${
                    isShuffle
                      ? 'text-[#3CC8F5]'
                      : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                  title="Aleatorio"
                >
                  <Shuffle className="h-4 w-4" />
                </button>

                {/* Anterior */}
                <button
                  onClick={skipToPrevious}
                  className="p-1.5 text-zinc-600 dark:text-zinc-300 transition-colors hover:text-zinc-900 dark:hover:text-white active:scale-95 cursor-pointer"
                  title="Anterior"
                >
                  <SkipBack className="h-5 w-5" />
                </button>

                {/* Play / Pausa */}
                <button
                  onClick={togglePlayPause}
                  disabled={isLoadingAudio}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3CC8F5] text-black shadow-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-80 cursor-pointer"
                  title={isLoadingAudio ? 'Cargando audio...' : isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {isLoadingAudio ? (
                    <Loader2 className="h-5 w-5 animate-spin text-black" />
                  ) : isPlaying ? (
                    <Pause className="h-5 w-5 fill-black" />
                  ) : (
                    <Play className="ml-0.5 h-5 w-5 fill-black" />
                  )}
                </button>

                {/* Siguiente */}
                <button
                  onClick={skipToNext}
                  className="p-1.5 text-zinc-600 dark:text-zinc-300 transition-colors hover:text-zinc-900 dark:hover:text-white active:scale-95 cursor-pointer"
                  title="Siguiente"
                >
                  <SkipForward className="h-5 w-5" />
                </button>

                {/* Repetir */}
                <button
                  onClick={toggleRepeat}
                  className={`relative hidden sm:flex p-2 rounded-full transition-colors cursor-pointer ${
                    repeatMode !== 'off'
                      ? 'text-[#3CC8F5]'
                      : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                  title={`Repetir: ${repeatMode}`}
                >
                  <Repeat className="h-4 w-4" />
                  {repeatMode === 'one' && (
                    <span className="absolute top-0.5 right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-[#3CC8F5] text-[8px] font-bold text-black">
                      1
                    </span>
                  )}
                </button>

                {/* Popover cola */}
                <div className="relative hidden md:block">
                  <button
                    onClick={() => setShowQueuePopover(!showQueuePopover)}
                    className="p-2 text-zinc-400 hover:text-[#3CC8F5] transition-colors cursor-pointer"
                    title="Ver en fila"
                  >
                    <ListMusic className="h-4 w-4" />
                  </button>

                  {showQueuePopover && (
                    <div className="absolute bottom-12 right-0 w-72 rounded-2xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl z-50 text-left">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                        En fila ({queue.length})
                      </p>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 scrollbar-hide">
                        {queue.map((t: any, i: number) => (
                          <div
                            key={`${t.id}-${i}`}
                            className={`text-xs truncate px-2 py-1.5 rounded-lg ${
                              t.id === currentTrack.id ? 'bg-[#3CC8F5]/20 text-[#3CC8F5] font-bold' : 'text-zinc-300'
                            }`}
                          >
                            {t.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Opciones */}
                <button
                  onClick={() => onOpenPlaylistModal(currentTrack)}
                  className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Añadir a lista"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {/* Minimizar */}
                <button
                  onClick={() => setIsMinimized(true)}
                  className="hidden p-2 text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-white sm:block cursor-pointer"
                  title="Minimizar reproductor"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>

                {/* Maximizar */}
                <button
                  onClick={openFullScreen}
                  className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Pantalla completa"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {fullScreen}
    </>
  );
}