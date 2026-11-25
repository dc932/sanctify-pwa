import { BookOpen, FileText, Play, Pause, Music, Mic, MoreVertical } from 'lucide-react';
import { useAudio } from '@/context/AudioContext';
import { SacredHeartIcon } from '@/components/SacredHeartIcon';
import type { Track } from '@/types/audio';

const categoryStyles: Record<
  string,
  { label: string; icon: typeof Music; bg: string; text: string; darkBg: string; darkText: string }
> = {
  music: { label: 'Música', icon: Music, bg: 'bg-amber-50', text: 'text-amber-700', darkBg: 'dark:bg-amber-950/60', darkText: 'dark:text-amber-400' },
  podcast: { label: 'Podcast', icon: Mic, bg: 'bg-sky-50', text: 'text-sky-700', darkBg: 'dark:bg-sky-950/60', darkText: 'dark:text-sky-400' },
  podcasts: { label: 'Podcast', icon: Mic, bg: 'bg-sky-50', text: 'text-sky-700', darkBg: 'dark:bg-sky-950/60', darkText: 'dark:text-sky-400' },
  audio: { label: 'Audio', icon: Mic, bg: 'bg-sky-50', text: 'text-sky-700', darkBg: 'dark:bg-sky-950/60', darkText: 'dark:text-sky-400' },
  blog: { label: 'Lectura', icon: BookOpen, bg: 'bg-emerald-50', text: 'text-emerald-700', darkBg: 'dark:bg-emerald-950/60', darkText: 'dark:text-emerald-400' },
  lectura: { label: 'Lectura', icon: BookOpen, bg: 'bg-emerald-50', text: 'text-emerald-700', darkBg: 'dark:bg-emerald-950/60', darkText: 'dark:text-emerald-400' },
  lecturas: { label: 'Lectura', icon: BookOpen, bg: 'bg-emerald-50', text: 'text-emerald-700', darkBg: 'dark:bg-emerald-950/60', darkText: 'dark:text-emerald-400' },
  video: { label: 'Video', icon: Music, bg: 'bg-rose-50', text: 'text-rose-700', darkBg: 'dark:bg-rose-950/60', darkText: 'dark:text-rose-400' },
};

interface TrackCardProps {
  track: Track;
  onSelectLectura?: (track: Track) => void;
  onOpenPlaylistModal?: (track: Track) => void;
}

export default function TrackCard({ track, onSelectLectura, onOpenPlaylistModal }: TrackCardProps) {
  const { currentTrack, isPlaying, playTrack, togglePlayPause, favorites, toggleFavorite } = useAudio();
  const isActive = currentTrack?.id === track.id;
  const isFavorite = favorites.has(track.id);

  // Detección estricta de PDF o Lectura
  const fileUrl = ((track as any).file_url || track.audioUrl || '').toLowerCase();
  const rawCat = (track.category || 'music').toLowerCase().trim();
  const title = (track.title || '').toLowerCase();

  const isPdf = 
    fileUrl.includes('.pdf') || 
    rawCat === 'blog' || 
    rawCat === 'lectura' || 
    rawCat === 'lecturas' || 
    title.includes('.pdf');

  const cat = categoryStyles[rawCat] || (isPdf ? categoryStyles['blog'] : categoryStyles['music']);
  const CatIcon = cat.icon;

  const handleClick = () => {
    if (isPdf) {
      // Disparamos el evento global y la función para abrir el visor de lecturas de forma obligatoria
      const event = new CustomEvent('open-lecturas-view', { detail: track });
      window.dispatchEvent(event);
      if (onSelectLectura) onSelectLectura(track);
      return;
    }

    if (isActive) {
      togglePlayPause();
    } else {
      playTrack(track);
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(track.id);
  };

  const handleOpenModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenPlaylistModal) {
      onOpenPlaylistModal(track);
    } else {
      window.dispatchEvent(new CustomEvent('open-playlist-modal', { detail: track }));
    }
  };

  // ==========================================
  // RENDERIZADO DIFERENCIADO PARA PDF / LECTURA
  // ==========================================
  if (isPdf) {
    return (
      <div
        onClick={handleClick}
        className="group relative flex flex-col justify-between h-full w-full overflow-hidden rounded-2xl border border-emerald-500/30 bg-stone-900 text-left transition-all duration-300 hover:shadow-xl hover:shadow-emerald-950/40 hover:-translate-y-1 cursor-pointer"
      >
        <div className="relative aspect-square w-full overflow-hidden bg-emerald-950/20 flex items-center justify-center">
          {track.artworkUrl ? (
            <img
              src={track.artworkUrl}
              alt={track.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90"
            />
          ) : (
            <FileText className="h-16 w-16 text-emerald-500/60" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
          
          {/* Botones superiores derechos: Favorito y Menú de 3 puntos */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
            <button
              onClick={handleToggleFavorite}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all hover:bg-black cursor-pointer shadow-md"
              title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
            >
              <SacredHeartIcon 
                className={`h-4 w-4 transition-transform ${isFavorite ? 'scale-110 text-[#EF4444]' : 'text-white hover:text-[#3CC8F5]'}`} 
                filled={isFavorite} 
              />
            </button>

            <button
              onClick={handleOpenModal}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all hover:bg-black cursor-pointer shadow-md"
              title="Guardar en carpetas o listas"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>

          {/* Botón flotante exclusivo de lectura */}
          <div className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
            <BookOpen className="h-5 w-5" />
          </div>
        </div>

        <div className="flex flex-col flex-1 justify-between p-3.5 sm:p-4 bg-[#121214]">
          <div className="mb-2">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-950 text-emerald-400 border border-emerald-800/50">
              <BookOpen className="h-3 w-3" />
              Lectura / PDF
            </span>
          </div>
          <div className="flex flex-col justify-end">
            <h3 className="text-xs sm:text-sm font-semibold text-white line-clamp-2 leading-tight">
              {track.title}
            </h3>
            <p className="truncate text-[11px] text-zinc-400 mt-1">
              {track.artist || 'Comunidad Orante'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDERIZADO NORMAL PARA MÚSICA / AUDIO
  // ==========================================
  return (
    <button
      onClick={handleClick}
      className={`group relative flex flex-col justify-between h-full w-full overflow-hidden rounded-2xl border text-left transition-all duration-300 hover:shadow-xl hover:shadow-stone-300/40 dark:hover:shadow-black/40 ${
        isActive
          ? 'border-amber-300 shadow-lg shadow-amber-200/40 dark:border-amber-700 dark:shadow-amber-900/30'
          : 'border-stone-200 shadow-sm hover:-translate-y-1 dark:border-stone-800 dark:shadow-none bg-white dark:bg-stone-900'
      }`}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-stone-100 dark:bg-stone-800">
        <img
          src={track.artworkUrl || 'https://images.pexels.com/photos/426976/pexels-photo-426976.jpeg?auto=compress&cs=tinysrgb&w=600'}
          alt={track.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        
        {/* Botones superiores derechos: Favorito y Menú de 3 puntos */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
          <button
            onClick={handleToggleFavorite}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all hover:bg-black cursor-pointer shadow-md"
            title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          >
            <SacredHeartIcon 
              className={`h-4 w-4 transition-transform ${isFavorite ? 'scale-110 text-[#EF4444]' : 'text-white hover:text-[#3CC8F5]'}`} 
              filled={isFavorite} 
            />
          </button>

          <button
            onClick={handleOpenModal}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all hover:bg-black cursor-pointer shadow-md"
            title="Guardar en carpetas o listas"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>

        <div
          className={`absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-all duration-300 ${
            isActive
              ? 'scale-100 bg-amber-600 text-white'
              : 'translate-y-2 bg-white/95 text-stone-800 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'
          }`}
        >
          {isActive && isPlaying ? (
            <Pause className="h-5 w-5" fill="currentColor" />
          ) : (
            <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
          )}
        </div>
        {isActive && isPlaying && (
          <div className="absolute top-3 left-3 flex items-end gap-0.5 rounded-full bg-black/60 px-2 py-1.5 backdrop-blur-sm">
            <span className="h-2.5 w-0.5 animate-eq-bar bg-amber-400" style={{ animationDelay: '0ms' }} />
            <span className="h-3.5 w-0.5 animate-eq-bar bg-amber-400" style={{ animationDelay: '150ms' }} />
            <span className="h-2 w-0.5 animate-eq-bar bg-amber-400" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 justify-between p-3.5 sm:p-4">
        <div className="mb-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cat.bg} ${cat.text} ${cat.darkBg} ${cat.darkText}`}>
            <CatIcon className="h-3 w-3" />
            {cat.label}
          </span>
        </div>
        <div className="flex flex-col justify-end">
          <h3 className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-100 line-clamp-2 leading-tight">
            {track.title}
          </h3>
          <p className="truncate text-[11px] text-stone-500 dark:text-stone-400 mt-1">
            {track.artist || 'Comunidad Orante'}
          </p>
        </div>
      </div>
    </button>
  );
}