import { memo } from 'react';
import { Trash2 } from 'lucide-react';
import type { Track } from '@/types/audio';

interface QueueTabProps {
  queue: Track[];
  currentIndex: number;
  onPlay: (track: Track, queue: Track[]) => void;
  onRemove: (trackId: string) => void;
}

function QueueTabBase({ queue, currentIndex, onPlay, onRemove }: QueueTabProps) {
  return (
    <div className="space-y-3 animate-in fade-in duration-300 w-full text-left">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Pistas en fila ({queue.length})
        </h3>
      </div>

      <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1 scrollbar-hide">
        {queue.map((track, idx) => {
          const isCurrent = idx === currentIndex;
          return (
            <div
              key={`${track.id}-${idx}`}
              className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                isCurrent
                  ? 'bg-zinc-900 border border-[#3CC8F5]/40 shadow-md'
                  : 'bg-zinc-900/40 border border-zinc-800/60'
              }`}
            >
              <img
                src={track.artworkUrl}
                alt={track.title}
                className="h-11 w-11 rounded-xl object-cover shrink-0 cursor-pointer"
                onClick={() => onPlay(track, queue)}
              />
              <div
                className="min-w-0 flex-1 cursor-pointer"
                onClick={() => onPlay(track, queue)}
              >
                <p
                  className={`text-xs font-bold truncate ${
                    isCurrent ? 'text-[#3CC8F5]' : 'text-white'
                  }`}
                >
                  {track.title}
                </p>
                <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                  {track.artist}
                </p>
              </div>

              {!isCurrent && (
                <button
                  onClick={() => onRemove(track.id)}
                  className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors"
                  title="Quitar de en fila"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const QueueTab = memo(QueueTabBase);
