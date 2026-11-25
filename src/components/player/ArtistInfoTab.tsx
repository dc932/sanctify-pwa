import { memo } from 'react';
import type { Track } from '@/types/audio';

interface ArtistInfoTabProps {
  track: Track;
}

function ArtistInfoTabBase({ track }: ArtistInfoTabProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300 w-full text-left">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-800 to-zinc-900 p-6 border border-zinc-800 text-center space-y-4 shadow-xl">
        <img
          src={track.artworkUrl}
          alt={track.artist}
          className="h-24 w-24 rounded-full object-cover mx-auto shadow-2xl border-2 border-[#3CC8F5]/40"
        />
        <div>
          <h3 className="text-base font-bold text-white">{track.artist}</h3>
          <p className="text-[10px] text-[#3CC8F5] uppercase tracking-widest font-extrabold mt-1">
            Creador Verificado en Sanctify
          </p>
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed px-2">
          Dedicados a llevar contenido de fe, música sacra y reflexiones
          profundas para nutrir la vida espiritual de la comunidad.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          Detalles de la pista
        </h4>
        <p className="text-xs font-semibold text-white">{track.title}</p>
        <p className="text-xs text-zinc-400">
          Categoría:{' '}
          <span className="text-[#3CC8F5] capitalize font-medium">
            {track.category}
          </span>
        </p>
      </div>
    </div>
  );
}

export const ArtistInfoTab = memo(ArtistInfoTabBase);
