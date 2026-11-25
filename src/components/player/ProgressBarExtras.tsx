import { memo } from 'react';
import { Volume2, VolumeX, Gauge } from 'lucide-react';

const SPEED_OPTIONS = [1, 1.25, 1.5, 2];

interface ProgressBarExtrasProps {
  volume: number;
  playbackRate: number;
  showSpeedMenu: boolean;
  onToggleSpeedMenu: () => void;
  onSelectSpeed: (rate: number) => void;
  onVolumeChange: (level: number) => void;
}

function ProgressBarExtrasBase({
  volume,
  playbackRate,
  showSpeedMenu,
  onToggleSpeedMenu,
  onSelectSpeed,
  onVolumeChange,
}: ProgressBarExtrasProps) {
  return (
    <div className="mt-5 flex items-center justify-between bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800/80">
      <div className="flex items-center gap-2 flex-1 max-w-[200px]">
        <button
          onClick={() => onVolumeChange(volume === 0 ? 1 : 0)}
          className="text-zinc-400 hover:text-white shrink-0"
        >
          {volume === 0 ? (
            <VolumeX className="h-4 w-4 text-rose-400" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="w-full accent-[#3CC8F5] h-1 bg-zinc-800 rounded-lg cursor-pointer"
        />
      </div>

      <div className="relative">
        <button
          onClick={onToggleSpeedMenu}
          className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-zinc-800 text-[#3CC8F5] hover:bg-zinc-700 transition-colors"
        >
          <Gauge className="h-3.5 w-3.5" />
          <span>{playbackRate}x</span>
        </button>

        {showSpeedMenu && (
          <div className="absolute right-0 bottom-10 z-20 flex flex-col bg-zinc-900 border border-zinc-700 rounded-xl p-1 shadow-xl">
            {SPEED_OPTIONS.map((rate) => (
              <button
                key={rate}
                onClick={() => onSelectSpeed(rate)}
                className={`px-3 py-1 text-xs font-bold text-left rounded-lg transition-colors ${
                  playbackRate === rate
                    ? 'bg-[#3CC8F5] text-black'
                    : 'text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const ProgressBarExtras = memo(ProgressBarExtrasBase);
