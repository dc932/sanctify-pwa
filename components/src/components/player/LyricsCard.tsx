import { memo, useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import type { Track } from '@/types/audio';

interface LyricsCardProps {
  track: Track;
}

function LyricsCardBase({ track }: LyricsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const lyrics = track.lyrics?.trim();
  const preview = lyrics ? lyrics.split('\n').slice(0, 4).join('\n') : '';

  return (
    <>
      <section className="relative mt-6 overflow-hidden rounded-3xl border border-white/10 bg-zinc-800/60 p-5 text-left shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold tracking-tight text-white">Lyrics</h2>
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            disabled={!lyrics}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-700/80 text-zinc-200 transition hover:bg-zinc-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            title={lyrics ? 'Abrir letra completa' : 'Letra no disponible'}
            aria-label={lyrics ? 'Abrir letra completa' : 'Letra no disponible'}
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        {lyrics ? (
          <p className="mt-5 whitespace-pre-line line-clamp-4 text-base font-medium leading-7 text-zinc-200">
            {preview}
          </p>
        ) : (
          <p className="mt-5 text-sm leading-6 text-zinc-400">
            Letra no disponible temporalmente
          </p>
        )}
      </section>

      {isExpanded && lyrics && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-7">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#3CC8F5]">
                  Lyrics
                </p>
                <h2 className="truncate text-lg font-bold text-white">{track.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-zinc-300 transition hover:bg-white/20 hover:text-white"
                title="Cerrar letras"
                aria-label="Cerrar letras"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-7 sm:px-12 sm:py-10">
              <p className="whitespace-pre-line text-lg font-medium leading-9 text-zinc-100 sm:text-xl">
                {lyrics}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export const LyricsCard = memo(LyricsCardBase);
