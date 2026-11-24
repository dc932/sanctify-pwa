import { useEffect, useRef } from 'react';
import { ListPlus, Play, Heart, Trash2, ListMusic, X } from 'lucide-react';
import type { Track } from '@/types/audio';
import { useAudio } from '@/context/AudioContext';

interface TrackContextMenuProps {
  track: Track;
  currentPlaylistId?: string;
  onOpenPlaylistModal: (track: Track) => void;
  onRemoveFromPlaylist?: (trackId: string) => void;
  onClose: () => void;
}

export default function TrackContextMenu({
  track,
  currentPlaylistId,
  onOpenPlaylistModal,
  onRemoveFromPlaylist,
  onClose,
}: TrackContextMenuProps) {
  const { playTrack, addToQueue } = useAudio();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div
        ref={menuRef}
        className="w-full max-w-xs rounded-2xl border border-zinc-800 bg-[#151517] p-2 shadow-2xl text-white animate-in zoom-in-95"
      >
        {/* Encabezado con datos del audio */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-3 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <img src={track.artworkUrl} alt={track.title} className="h-9 w-9 rounded-lg object-cover" />
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white">{track.title}</p>
              <p className="truncate text-[11px] text-zinc-500">{track.artist}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Lista de acciones */}
        <div className="py-1">
          <button
            onClick={() => {
              playTrack(track);
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <Play className="h-4 w-4 text-[#3CC8F5] fill-[#3CC8F5]" />
            Reproducir ahora
          </button>

          <button
            onClick={() => {
              addToQueue(track);
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <ListMusic className="h-4 w-4 text-[#3CC8F5]" />
            Añadir a la cola
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenPlaylistModal(track);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <ListPlus className="h-4 w-4 text-[#3CC8F5]" />
            Añadir a lista o favoritos
          </button>

          {/* Opción para eliminar de la lista actual (solo si está dentro de una lista) */}
          {currentPlaylistId && onRemoveFromPlaylist && (
            <div className="border-t border-zinc-800/80 mt-1 pt-1">
              <button
                onClick={() => {
                  onRemoveFromPlaylist(track.id);
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar de esta lista
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}