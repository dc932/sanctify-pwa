import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { useAudio } from '@/context/AudioContext';

const COUNTDOWN_SECONDS = 5;
const MAX_VISIBLE_TRACKS = 6;
const RING_RADIUS = 16;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function UpNextPanel() {
  const {
    currentTrack,
    queue,
    currentIndex,
    position,
    duration,
    repeatMode,
    scheduledNextId,
    scheduleNext,
  } = useAudio();
  const [dismissedTrackId, setDismissedTrackId] = useState<string | null>(null);

  const upcoming = useMemo(() => {
    if (currentIndex < 0) return [];
    const after = queue.slice(currentIndex + 1);
    const wrapped = repeatMode === 'all' ? queue.slice(0, currentIndex) : [];
    return [...after, ...wrapped];
  }, [queue, currentIndex, repeatMode]);

  const remainingSeconds = duration - position;
  const secondsLeft = Math.ceil(remainingSeconds);
  const isInCountdown =
    duration > 0 && secondsLeft > 0 && secondsLeft <= COUNTDOWN_SECONDS;

  if (
    !currentTrack ||
    !isInCountdown ||
    repeatMode === 'one' ||
    upcoming.length === 0 ||
    dismissedTrackId === currentTrack.id
  ) {
    return null;
  }

  const nextTrack = upcoming.find((t) => t.id === scheduledNextId) ?? upcoming[0];
  const visibleTracks = upcoming.slice(0, MAX_VISIBLE_TRACKS);
  const ringFraction = Math.min(1, Math.max(0, remainingSeconds / COUNTDOWN_SECONDS));

  return (
    <div
      role="dialog"
      aria-label="Próximas pistas"
      className="fixed right-4 top-20 z-[55] w-[min(20rem,calc(100vw-2rem))] animate-in fade-in slide-in-from-top-2 duration-300 rounded-2xl border border-white/10 bg-zinc-950/85 p-4 text-white shadow-2xl shadow-black/50 backdrop-blur-xl sm:right-6 sm:top-24"
    >
      <div className="flex items-center gap-3">
        <div className="relative h-11 w-11 shrink-0">
          <svg className="h-11 w-11 -rotate-90" viewBox="0 0 40 40" aria-hidden="true">
            <circle
              cx="20"
              cy="20"
              r={RING_RADIUS}
              className="fill-none stroke-white/10"
              strokeWidth="3"
            />
            <circle
              cx="20"
              cy="20"
              r={RING_RADIUS}
              className="fill-none stroke-[#3CC8F5] transition-[stroke-dashoffset] duration-300 ease-linear"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - ringFraction)}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-black tabular-nums">
            {secondsLeft}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">Próximas pistas</p>
          <p className="text-[11px] text-zinc-400">Elige qué suena después</p>
        </div>

        <button
          type="button"
          onClick={() => setDismissedTrackId(currentTrack.id)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
          title="Cerrar"
          aria-label="Cerrar próximas pistas"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ul className="mt-4 space-y-1">
        {visibleTracks.map((track) => {
          const isSelected = track.id === nextTrack.id;
          return (
            <li key={track.id}>
              <button
                type="button"
                onClick={() => scheduleNext(track.id)}
                aria-pressed={isSelected}
                className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors ${
                  isSelected
                    ? 'bg-[#3CC8F5]/15 ring-1 ring-[#3CC8F5]/40'
                    : 'hover:bg-white/5'
                }`}
              >
                <img
                  src={track.artworkUrl}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-white">
                    {track.title}
                  </span>
                  <span className="block truncate text-[11px] text-zinc-400">
                    {track.artist}
                  </span>
                </span>
                {isSelected && (
                  <Check className="h-4 w-4 shrink-0 text-[#3CC8F5]" aria-label="Seleccionada" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
