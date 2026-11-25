import { Music } from 'lucide-react';
import { tracks } from '@/data/tracks';

interface PlaylistThumbnailProps {
  trackIds: string[];
  sizeClass?: string;
}

export default function PlaylistThumbnail({ trackIds = [], sizeClass = 'h-24 w-24' }: PlaylistThumbnailProps) {
  // Obtener las obras/portadas de las pistas guardadas
  const playlistTracks = tracks.filter((t) => trackIds.includes(t.id));
  const artworks = playlistTracks.map((t) => t.artworkUrl).filter(Boolean);

  // Si tiene 4 o más canciones, muestra el collage 2x2 estilo Spotify
  if (artworks.length >= 4) {
    return (
      <div className={`grid grid-cols-2 grid-rows-2 overflow-hidden rounded-xl border border-zinc-800 ${sizeClass}`}>
        {artworks.slice(0, 4).map((url, idx) => (
          <img key={idx} src={url} alt={`Thumbnail ${idx}`} className="h-full w-full object-cover" />
        ))}
      </div>
    );
  }

  // Si tiene entre 1 y 3 canciones, muestra la portada de la primera
  if (artworks.length > 0) {
    return (
      <img
        src={artworks[0]}
        alt="Playlist Cover"
        className={`rounded-xl object-cover border border-zinc-800 ${sizeClass}`}
      />
    );
  }

  // Si está vacía
  return (
    <div className={`flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-700 ${sizeClass}`}>
      <Music className="h-8 w-8" />
    </div>
  );
}