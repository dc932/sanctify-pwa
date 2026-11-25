export type TrackCategory = 'music' | 'podcast' | 'blog' | 'video';

export interface Track {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string;
  audioUrl?: string; // <-- Cambiado a opcional para permitir textos/blogs sin audio obligatorio
  category: TrackCategory;
  duration: number;
  lyrics?: string; // Aquí se almacena el texto completo de la lectura
}

export interface AudioState {
  currentTrack: Track | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  progressPercentage: number;
}