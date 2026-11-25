import { memo } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
} from 'lucide-react';

interface PlayerControlsProps {
  isPlaying: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
}

function PlayerControlsBase({
  isPlaying,
  isShuffle,
  repeatMode,
  onTogglePlay,
  onPrev,
  onNext,
  onToggleShuffle,
  onToggleRepeat,
}: PlayerControlsProps) {
  return (
    <div className="mt-5 flex items-center justify-between px-2">
      <button
        onClick={onToggleShuffle}
        className={`transition-colors p-2.5 rounded-full hover:bg-white/10 ${
          isShuffle ? 'text-[#3CC8F5]' : 'text-zinc-400 hover:text-white'
        }`}
        title="Aleatorio"
      >
        <Shuffle className="h-5 w-5" />
      </button>

      <button
        onClick={onPrev}
        className="p-2.5 text-zinc-300 transition-colors hover:text-white active:scale-95"
        title="Pista anterior"
      >
        <SkipBack className="h-7 w-7" />
      </button>

      <button
        onClick={onTogglePlay}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-[#3CC8F5] text-black shadow-xl shadow-[#3CC8F5]/20 transition-transform hover:scale-105 active:scale-95"
      >
        {isPlaying ? (
          <Pause className="h-7 w-7 fill-black" />
        ) : (
          <Play className="ml-1 h-7 w-7 fill-black" />
        )}
      </button>

      <button
        onClick={onNext}
        className="p-2.5 text-zinc-300 transition-colors hover:text-white active:scale-95"
        title="Pista siguiente"
      >
        <SkipForward className="h-7 w-7" />
      </button>

      <button
        onClick={onToggleRepeat}
        className={`relative transition-colors p-2.5 rounded-full hover:bg-white/10 ${
          repeatMode !== 'off'
            ? 'text-[#3CC8F5]'
            : 'text-zinc-400 hover:text-white'
        }`}
        title={`Modo repetición: ${repeatMode}`}
      >
        <Repeat className="h-5 w-5" />
        {repeatMode === 'one' && (
          <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#3CC8F5] text-[9px] font-extrabold text-black">
            1
          </span>
        )}
      </button>
    </div>
  );
}

export const PlayerControls = memo(PlayerControlsBase);
