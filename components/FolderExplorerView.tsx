import { useState, useEffect } from 'react';
import { Folder, ChevronRight, FolderPlus, MoreVertical, ArrowLeft, X, Play, Pause, Music, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase } from '../supabase';
import { tracks as staticTracks } from '@/data/tracks';
import { useAudio } from '@/context/AudioContext';
import type { Track, TrackCategory } from '@/types/audio';

interface FolderItem {
  id: string;
  name: string;
  parent_id: string | null;
  color?: string;
}

interface FolderExplorerProps {
  onClose: () => void;
  session: any;
  onOpenPlaylistModal?: (track: Track) => void;
}

export default function FolderExplorerView({ onClose, session, onOpenPlaylistModal }: FolderExplorerProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'Mi Biblioteca' },
  ]);
  
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [tracksInCurrentFolder, setTracksInCurrentFolder] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para ordenamiento y guardado
  const [sortOrder, setSortOrder] = useState<'custom' | 'asc' | 'desc'>('custom');
  const [savingOrder, setSavingOrder] = useState(false);
  
  // Estados para el formulario de nueva carpeta
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#3CC8F5');

  const audio = useAudio();

  useEffect(() => {
    if (session?.user) {
      fetchUserFolders();
    }
  }, [session]);

  useEffect(() => {
    if (currentFolderId) {
      fetchTracksForFolder(currentFolderId);
    } else {
      setTracksInCurrentFolder([]);
    }
  }, [currentFolderId]);

  const fetchUserFolders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_folders')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) setFolders(data);
    } catch (err) {
      console.error('Error al cargar carpetas:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTracksForFolder = async (folderId: string) => {
    try {
      const { data: ftData, error: ftError } = await supabase
        .from('folder_tracks')
        .select('track_id, position')
        .eq('folder_id', folderId)
        .order('position', { ascending: true });

      if (ftError) throw ftError;

      if (ftData && ftData.length > 0) {
        const positionMap = new Map(ftData.map((item: any) => [item.track_id, item.position || 0]));
        const trackIds = ftData.map((item: any) => item.track_id);

        const { data: dynamicContent } = await supabase
          .from('creator_content')
          .select('*')
          .eq('status', 'published');

        const formattedDynamicTracks: Track[] = (dynamicContent || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          artist: item.category || 'Creador',
          artworkUrl: item.artwork_url || 'https://images.pexels.com/photos/426976/pexels-photo-426976.jpeg?auto=compress&cs=tinysrgb&w=600',
          audioUrl: item.file_url,
          category: (item.category as TrackCategory) || 'music',
          duration: 0,
        }));

        const allAvailableTracks = [...staticTracks, ...formattedDynamicTracks];
        const matchedTracks = allAvailableTracks.filter((t) => trackIds.includes(t.id));

        matchedTracks.sort((a, b) => {
          const posA = positionMap.get(a.id) ?? 0;
          const posB = positionMap.get(b.id) ?? 0;
          return posA - posB;
        });

        setTracksInCurrentFolder(matchedTracks);
        setSortOrder('custom');
      } else {
        setTracksInCurrentFolder([]);
      }
    } catch (err) {
      console.error('Error al cargar pistas de la carpeta:', err);
      setTracksInCurrentFolder([]);
    }
  };

  const handleOpenFolder = (folder: FolderItem) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    setCurrentFolderId(newBreadcrumbs[newBreadcrumbs.length - 1].id);
  };

  // Función para ordenar alfabéticamente (A-Z / Z-A)
  const handleSortAlphabetical = (order: 'asc' | 'desc') => {
    setSortOrder(order);
    const sorted = [...tracksInCurrentFolder].sort((a, b) => {
      if (order === 'asc') {
        return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
      } else {
        return b.title.localeCompare(a.title, 'es', { sensitivity: 'base' });
      }
    });

    setTracksInCurrentFolder(sorted);
    saveNewPositionsToSupabase(sorted);
  };

  // Función al soltar un elemento con Drag & Drop
  const handleOnDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const reordered = Array.from(tracksInCurrentFolder);
    const [reorderedItem] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, reorderedItem);

    setSortOrder('custom');
    setTracksInCurrentFolder(reordered);
    saveNewPositionsToSupabase(reordered);
  };

  // Guardar posiciones actualizadas en Supabase
  const saveNewPositionsToSupabase = async (updatedTracks: Track[]) => {
    if (!currentFolderId) return;
    try {
      setSavingOrder(true);
      const updates = updatedTracks.map((track, index) =>
        supabase
          .from('folder_tracks')
          .update({ position: index + 1 })
          .eq('track_id', track.id)
          .eq('folder_id', currentFolderId)
      );

      await Promise.all(updates);
    } catch (err) {
      console.error('Error al guardar el nuevo orden:', err);
    } finally {
      setSavingOrder(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !session?.user) return;

    try {
      const { data, error } = await supabase
        .from('user_folders')
        .insert({
          user_id: session.user.id,
          name: newFolderName.trim(),
          parent_id: currentFolderId,
          color: newFolderColor,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setFolders((prev) => [...prev, data]);
      }

      setNewFolderName('');
      setIsCreating(false);
    } catch (err) {
      console.error('Error al crear carpeta:', err);
    }
  };

  const currentFolders = folders.filter((f) => f.parent_id === currentFolderId);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0B] p-4 sm:p-6 text-zinc-900 dark:text-white transition-colors pb-32">
      <div className="mx-auto max-w-6xl space-y-6">
        
        {/* Botón de retorno */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-all hover:border-[#3CC8F5] hover:text-[#3CC8F5] cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 text-[#3CC8F5]" />
            Volver
          </button>
          <span className="text-xs font-bold text-[#3CC8F5] uppercase tracking-wider">
            Explorador de Biblioteca Avanzado
          </span>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121214] p-4 scrollbar-hide">
          {breadcrumbs.map((crumb, idx) => (
            <div key={crumb.id || 'root'} className="flex items-center gap-2 shrink-0">
              {idx > 0 && <ChevronRight className="h-4 w-4 text-zinc-400 dark:text-zinc-600" />}
              <button
                onClick={() => handleBreadcrumbClick(idx)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                  idx === breadcrumbs.length - 1
                    ? 'bg-[#3CC8F5] text-black shadow-lg shadow-[#3CC8F5]/25'
                    : 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                }`}
              >
                <span>{idx === 0 ? '📁' : '📂'}</span>
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        {/* Encabezado y botón de nueva carpeta */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold">
              {breadcrumbs[breadcrumbs.length - 1].name}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Organiza tus contenidos espirituales en carpetas y subcarpetas ilimitadas.
            </p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 rounded-xl bg-[#3CC8F5] px-4 py-2.5 text-xs font-bold text-black transition-transform hover:scale-105 shadow-md cursor-pointer"
          >
            <FolderPlus className="h-4 w-4" /> Nueva Carpeta aquí
          </button>
        </div>

        {/* Formulario flotante para crear nueva carpeta */}
        {isCreating && (
          <div className="rounded-2xl border border-[#3CC8F5]/40 bg-zinc-50 dark:bg-[#121214] p-5 space-y-4 shadow-xl animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#3CC8F5]">
                Crear nueva carpeta en "{breadcrumbs[breadcrumbs.length - 1].name}"
              </h3>
              <button onClick={() => setIsCreating(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nombre de la carpeta..."
                className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white outline-none focus:border-[#3CC8F5]"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newFolderColor}
                  onChange={(e) => setNewFolderColor(e.target.value)}
                  className="h-10 w-10 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-transparent cursor-pointer"
                  title="Color distintivo"
                />
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="rounded-xl bg-[#3CC8F5] px-5 py-2.5 text-xs font-bold text-black hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Sección de Subcarpetas */}
        {currentFolders.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Subcarpetas</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {currentFolders.map((folder) => (
                <div
                  key={folder.id}
                  onClick={() => handleOpenFolder(folder)}
                  className="group relative flex flex-col justify-between rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121214] p-5 cursor-pointer transition-all hover:border-[#3CC8F5] hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-inner"
                      style={{ backgroundColor: `${folder.color || '#3CC8F5'}20`, color: folder.color || '#3CC8F5' }}
                    >
                      <Folder className="h-6 w-6 fill-current" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-[#3CC8F5] transition-colors truncate">
                      {folder.name}
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-1">Subcarpeta</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sección de Pistas en esta carpeta con Ordenamiento y Drag & Drop */}
        {currentFolderId && (
          <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            
            {/* Barra de Herramientas de Ordenamiento */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Pistas en esta carpeta ({tracksInCurrentFolder.length}) {savingOrder && '• Guardando orden...'}
              </h3>

              <div className="flex items-center gap-2">
                {/* Botón A-Z */}
                <button
                  onClick={() => handleSortAlphabetical('asc')}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                    sortOrder === 'asc'
                      ? 'border-[#3CC8F5] bg-[#3CC8F5]/10 text-[#3CC8F5]'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <ArrowUp className="h-3.5 w-3.5" /> A - Z
                </button>

                {/* Botón Z-A */}
                <button
                  onClick={() => handleSortAlphabetical('desc')}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                    sortOrder === 'desc'
                      ? 'border-[#3CC8F5] bg-[#3CC8F5]/10 text-[#3CC8F5]'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <ArrowDown className="h-3.5 w-3.5" /> Z - A
                </button>
              </div>
            </div>

            {tracksInCurrentFolder.length > 0 ? (
              <DragDropContext onDragEnd={handleOnDragEnd}>
                <Droppable droppableId={`folder-${currentFolderId}`}>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2"
                    >
                      {tracksInCurrentFolder.map((track, index) => {
                        const isActive = audio?.currentTrack?.id === track.id;
                        const isPlaying = isActive && audio?.isPlaying;

                        return (
                          <Draggable key={track.id} draggableId={track.id} index={index}>
                            {(providedDraggable, snapshot) => (
                              <div
                                ref={providedDraggable.innerRef}
                                {...providedDraggable.draggableProps}
                                onClick={() => (isActive ? audio?.togglePlayPause() : audio?.playTrack(track, tracksInCurrentFolder))}
                                className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${
                                  snapshot.isDragging
                                    ? 'border-[#3CC8F5] bg-zinc-900 shadow-2xl scale-[1.02] z-50'
                                    : isActive 
                                    ? 'border-[#3CC8F5]/40 bg-[#3CC8F5]/10' 
                                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121214] hover:border-zinc-700'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {/* Asidero para arrastrar (Drag Handle) */}
                                  <div
                                    {...providedDraggable.dragHandleProps}
                                    onClick={(e) => e.stopPropagation()}
                                    className="cursor-grab text-zinc-500 hover:text-zinc-300 active:cursor-grabbing p-1"
                                    aria-label="Reordenar pista"
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </div>

                                  <img
                                    src={track.artworkUrl || 'https://images.pexels.com/photos/426976/pexels-photo-426976.jpeg?auto=compress&cs=tinysrgb&w=600'}
                                    alt={track.title}
                                    className="h-12 w-12 rounded-lg object-cover"
                                  />
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-zinc-900 dark:text-white">{track.title}</p>
                                    <p className="truncate text-xs text-zinc-500">{track.artist}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="text-[11px] font-bold text-zinc-500 hidden sm:inline">
                                    #{index + 1}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onOpenPlaylistModal) onOpenPlaylistModal(track);
                                    }}
                                    className="p-2 text-zinc-400 hover:text-white cursor-pointer"
                                    title="Más opciones"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      isActive ? audio?.togglePlayPause() : audio?.playTrack(track, tracksInCurrentFolder);
                                    }}
                                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3CC8F5] text-black transition-transform active:scale-95 cursor-pointer"
                                  >
                                    {isPlaying ? (
                                      <Pause className="h-4 w-4 fill-black" />
                                    ) : (
                                      <Play className="h-4 w-4 fill-black ml-0.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 py-12 text-center">
                <Music className="mx-auto h-10 w-10 text-zinc-400 dark:text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-500">No hay pistas guardadas en esta carpeta todavía.</p>
              </div>
            )}
          </div>
        )}

        {/* Estado vacío general si no hay carpetas ni pistas en la raíz */}
        {!currentFolderId && currentFolders.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 py-16 text-center">
            <Folder className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600 mb-3" />
            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No hay carpetas aquí</p>
            <p className="text-xs text-zinc-500 mt-1">Haz clic en "Nueva Carpeta aquí" para empezar a organizar tu biblioteca.</p>
          </div>
        )}

      </div>
    </div>
  );
}