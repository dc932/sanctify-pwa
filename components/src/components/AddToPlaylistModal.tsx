import { SacredHeartIcon } from '@/components/SacredHeartIcon';
import { useState, useEffect } from 'react';
import { Plus, Check, X, ListPlus, Folder, Share2, ChevronRight, AlertTriangle, CheckCircle2, Send } from 'lucide-react';
import { supabase } from '../supabase';
import type { Track } from '@/types/audio';

interface AddToPlaylistModalProps {
  track: Track;
  session: any;
  onClose: () => void;
}

export default function AddToPlaylistModal({ track, session, onClose }: AddToPlaylistModalProps) {
  if (!track) return null;

  const [isFavorite, setIsFavorite] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [folderTracks, setFolderTracks] = useState<string[]>([]);
  
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [newFolderCategory, setNewFolderCategory] = useState<string>(track.category || 'music');
  
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [trackCopied, setTrackCopied] = useState(false);

  // Estados para reportar contenido
  const [showReportView, setShowReportView] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  useEffect(() => {
    if (session?.user) {
      checkFavorite();
      fetchPlaylists();
      fetchFolders();
      fetchTrackFolders();
    }
  }, [session, track]);

  const checkFavorite = async () => {
    try {
      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('track_id', track.id)
        .maybeSingle();
      if (data) setIsFavorite(true);
    } catch (e) {
      console.error('Error al verificar favorito:', e);
    }
  };

  const toggleFavorite = async () => {
    if (!session?.user) return;
    try {
      if (isFavorite) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', session.user.id)
          .eq('track_id', track.id);
        setIsFavorite(false);
        setMessage('Eliminado de favoritos');
      } else {
        await supabase
          .from('favorites')
          .insert({ user_id: session.user.id, track_id: track.id });
        setIsFavorite(true);
        setMessage('¡Añadido a favoritos!');
      }
    } catch (e: any) {
      setMessage('Error al actualizar favoritos');
    }
    setTimeout(() => setMessage(''), 2500);
  };

  const fetchPlaylists = async () => {
    if (!session?.user) return;
    try {
      const { data } = await supabase
        .from('playlists')
        .select('id, title, folder_id, playlist_tracks(track_id)')
        .eq('user_id', session.user.id);
      if (data) setPlaylists(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFolders = async () => {
    if (!session?.user) return;
    try {
      const { data } = await supabase
        .from('user_folders')
        .select('id, name, parent_id, color, category')
        .eq('user_id', session.user.id)
        .order('name', { ascending: true });
      if (data) setFolders(data);
    } catch (e) {
      console.error('Error cargando carpetas:', e);
    }
  };

  const fetchTrackFolders = async () => {
    if (!session?.user) return;
    try {
      const { data } = await supabase
        .from('folder_tracks')
        .select('folder_id')
        .eq('track_id', track.id);
      
      if (data) {
        setFolderTracks(data.map((ft: any) => ft.folder_id));
      }
    } catch (e) {
      console.error('Error cargando relaciones de carpetas:', e);
    }
  };

  const toggleInFolder = async (folderId: string, isInFolder: boolean) => {
    try {
      if (isInFolder) {
        await supabase
          .from('folder_tracks')
          .delete()
          .eq('folder_id', folderId)
          .eq('track_id', track.id);
        setFolderTracks((prev) => prev.filter((id) => id !== folderId));
        setMessage('Pista removida de la carpeta');
      } else {
        await supabase
          .from('folder_tracks')
          .insert({ folder_id: folderId, track_id: track.id });
        setFolderTracks((prev) => [...prev, folderId]);
        setMessage('¡Pista guardada en la carpeta!');
      }
    } catch (e) {
      setMessage('Error al actualizar carpeta');
    }
    setTimeout(() => setMessage(''), 2500);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !session?.user) return;

    setLoading(true);
    try {
      const payload: any = {
        user_id: session.user.id,
        name: newFolderName.trim(),
        parent_id: newFolderParentId || null,
        category: newFolderCategory,
      };

      const { data, error } = await supabase
        .from('user_folders')
        .insert(payload)
        .select()
        .single();

      if (!error && data) {
        setFolders((prev) => [...prev, data]);
        await toggleInFolder(data.id, false);
        setNewFolderName('');
        setNewFolderParentId(null);
        setMessage('¡Carpeta creada y pista guardada!');
      }
    } catch (err) {
      setMessage('Error al crear la carpeta');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleShareTrack = async () => {
    const trackUrl = `${window.location.origin}?track=${track.id}`;
    const shareData = {
      title: track.title,
      text: `Escucha "${track.title}" de ${track.artist} en Sanctify.`,
      url: trackUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error al compartir pista:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(trackUrl);
        setTrackCopied(true);
        setMessage('¡Enlace de la pista copiado!');
        setTimeout(() => {
          setTrackCopied(false);
          setMessage('');
        }, 2500);
      } catch (err) {
        console.error('Error al copiar enlace', err);
      }
    }
  };

  const createPlaylistAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    const user = session?.user;
    if (!user) return;

    setLoading(true);
    try {
      const insertPayload: any = { user_id: user.id, title: newPlaylistName.trim() };
      if (selectedFolderId) insertPayload.folder_id = selectedFolderId;

      const { data: newPl, error: plError } = await supabase
        .from('playlists')
        .insert(insertPayload)
        .select()
        .single();

      if (!plError && newPl) {
        await supabase
          .from('playlist_tracks')
          .insert({ playlist_id: newPl.id, track_id: track.id });

        setNewPlaylistName('');
        setSelectedFolderId('');
        setMessage('¡Lista creada y canción añadida!');
        await fetchPlaylists();
      }
    } catch (err) {
      setMessage('Ocurrió un error inesperado');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const toggleInPlaylist = async (playlistId: string, hasTrack: boolean) => {
    try {
      if (hasTrack) {
        await supabase
          .from('playlist_tracks')
          .delete()
          .eq('playlist_id', playlistId)
          .eq('track_id', track.id);
        setMessage('Canción eliminada de la lista');
      } else {
        await supabase
          .from('playlist_tracks')
          .insert({ playlist_id: playlistId, track_id: track.id });
        setMessage('¡Canción añadida a la lista!');
      }
      fetchPlaylists();
    } catch (e) {
      setMessage('Error al actualizar la lista');
    }
    setTimeout(() => setMessage(''), 2500);
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason.trim() || !session?.user?.id) return;

    setSubmittingReport(true);
    try {
      const { error } = await supabase.from('content_reports').insert({
        track_id: track.id,
        user_id: session.user.id,
        reason: reportReason.trim(),
        status: 'pending',
      });

      if (error) throw error;

      setReportSuccess(true);
      setTimeout(() => {
        setShowReportView(false);
        setReportSuccess(false);
        setReportReason('');
      }, 2500);
    } catch (err) {
      console.error('Error al enviar reporte:', err);
      setMessage('Error al enviar reporte. Inténtalo de nuevo.');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSubmittingReport(false);
    }
  };

  const parentFolders = folders.filter((f) => !f.parent_id);
  const getSubfolders = (parentId: string) => folders.filter((f) => f.parent_id === parentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-[#121214] p-6 shadow-2xl text-white max-h-[85vh] overflow-y-auto">
        <button onClick={onClose} className="absolute right-4 top-4 text-zinc-500 hover:text-white cursor-pointer z-10">
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-zinc-800 pb-4 pr-6">
          <img src={track.artworkUrl} alt={track.title} className="h-12 w-12 rounded-xl object-cover shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{track.title}</p>
            <p className="truncate text-xs text-zinc-500">{track.artist}</p>
          </div>
        </div>

        {message && <p className="mt-3 text-center text-xs font-semibold text-[#3CC8F5]">{message}</p>}

        {!showReportView ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={toggleFavorite}
                className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-xs font-bold transition-all cursor-pointer ${
                  isFavorite
                    ? 'border-red-500/50 bg-red-500/10 text-red-400'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <SacredHeartIcon className={`h-4 w-4 ${isFavorite ? 'scale-105' : 'text-zinc-400'}`} filled={isFavorite} />
                <span>{isFavorite ? 'Favorito' : 'Favoritos'}</span>
              </button>

              <button
                onClick={handleShareTrack}
                className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-xs font-bold text-zinc-300 hover:border-[#3CC8F5] hover:text-[#3CC8F5] transition-all cursor-pointer"
              >
                {trackCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4 text-[#3CC8F5]" />}
                <span>{trackCopied ? '¡Copiado!' : 'Compartir'}</span>
              </button>
            </div>

            {folders.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Guardar en tus Carpetas</p>
                <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                  {parentFolders.map((folder) => {
                    const isInFolder = folderTracks.includes(folder.id);
                    const subfolders = getSubfolders(folder.id);

                    return (
                      <div key={folder.id} className="space-y-1.5">
                        <button
                          onClick={() => toggleInFolder(folder.id, isInFolder)}
                          className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2 text-xs transition-all cursor-pointer ${
                            isInFolder
                              ? 'border-[#3CC8F5]/40 bg-[#3CC8F5]/10 text-white'
                              : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate font-bold">
                            <Folder className="h-3.5 w-3.5" style={{ color: folder.color || '#3CC8F5' }} />
                            {folder.name}
                          </span>
                          {isInFolder && <Check className="h-4 w-4 text-[#3CC8F5]" />}
                        </button>

                        {subfolders.length > 0 && (
                          <div className="ml-5 pl-3 border-l border-zinc-800 space-y-1">
                            {subfolders.map((sub) => {
                              const isSubInFolder = folderTracks.includes(sub.id);
                              return (
                                <button
                                  key={sub.id}
                                  onClick={() => toggleInFolder(sub.id, isSubInFolder)}
                                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-1.5 text-xs transition-all cursor-pointer ${
                                    isSubInFolder
                                      ? 'border-[#3CC8F5]/40 bg-[#3CC8F5]/10 text-white'
                                      : 'border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5 truncate font-medium">
                                    <ChevronRight className="h-3 w-3 text-zinc-500" />
                                    <Folder className="h-3 w-3" style={{ color: sub.color || '#3CC8F5' }} />
                                    {sub.name}
                                  </span>
                                  {isSubInFolder && <Check className="h-3.5 w-3.5 text-[#3CC8F5]" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Tus Listas de Reproducción</p>
              <div className="max-h-28 space-y-2 overflow-y-auto pr-1">
                {playlists.length === 0 && (
                  <p className="text-xs text-zinc-600 py-1 text-center">Aún no tienes listas creadas.</p>
                )}
                {playlists.map((pl) => {
                  const hasTrack = pl.playlist_tracks?.some((pt: any) => pt.track_id === track.id);
                  return (
                    <button
                      key={pl.id}
                      onClick={() => toggleInPlaylist(pl.id, hasTrack)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2 text-xs transition-all cursor-pointer ${
                        hasTrack
                          ? 'border-[#3CC8F5]/40 bg-[#3CC8F5]/5 text-white'
                          : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate font-medium">
                        <ListPlus className="h-3.5 w-3.5 text-[#3CC8F5]" />
                        {pl.title}
                      </span>
                      {hasTrack && <Check className="h-4 w-4 text-[#3CC8F5]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleCreateFolder} className="mt-4 border-t border-zinc-800 pt-3 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">Crear nueva carpeta</label>
              
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newFolderCategory}
                  onChange={(e) => setNewFolderCategory(e.target.value)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 outline-none focus:border-[#3CC8F5]"
                >
                  <option value="music">Música</option>
                  <option value="podcast">Audio</option>
                  <option value="blog">Lectura</option>
                  <option value="video">Videos</option>
                </select>

                <select
                  value={newFolderParentId || ''}
                  onChange={(e) => setNewFolderParentId(e.target.value ? e.target.value : null)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 outline-none focus:border-[#3CC8F5]"
                >
                  <option value="">(Raíz de categoría)</option>
                  {parentFolders.map((f) => (
                    <option key={f.id} value={f.id}>En: {f.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Nombre de carpeta..."
                  className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-[#3CC8F5]"
                />
                <button
                  type="submit"
                  disabled={loading || !newFolderName.trim()}
                  className="flex items-center gap-1 rounded-xl bg-[#3CC8F5] px-3.5 py-2 text-xs font-bold text-black hover:bg-[#32b2dc] disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Crear y Guardar
                </button>
              </div>
            </form>

            <form onSubmit={createPlaylistAndAdd} className="mt-4 border-t border-zinc-800 pt-3 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">Crear nueva lista tradicional</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Ej. Momentos de Oración"
                  className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-[#3CC8F5]"
                />
                <button
                  type="submit"
                  disabled={loading || !newPlaylistName.trim()}
                  className="flex items-center gap-1 rounded-xl bg-[#3CC8F5] px-3.5 py-2 text-xs font-bold text-black hover:bg-[#32b2dc] disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Crear
                </button>
              </div>
            </form>

            {/* Sección para Reportar Contenido */}
            <div className="mt-4 border-t border-zinc-800 pt-3">
              <button
                type="button"
                onClick={() => setShowReportView(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Reportar infracción de políticas</span>
              </button>
            </div>

            {/* Botón OK / Cerrar inferior garantizado y visible */}
            <div className="mt-5 pt-3 border-t border-zinc-800 flex justify-end">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#3CC8F5] text-black text-xs font-bold transition-transform hover:scale-[1.02] cursor-pointer"
              >
                OK / Listo
              </button>
            </div>
          </>
        ) : (
          /* Vista de Formulario de Reporte */
          <form onSubmit={handleSendReport} className="mt-4 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-sm font-bold">Reportar Contenido</h3>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Describe por qué este contenido infringe las políticas de la comunidad. El administrador revisará tu reporte y te dará una resolución.
            </p>

            {reportSuccess ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 animate-bounce" />
                <p className="text-xs font-bold text-emerald-300">¡Reporte enviado con éxito!</p>
                <p className="text-[11px] text-zinc-400">El administrador revisará el caso a la brevedad.</p>
              </div>
            ) : (
              <>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Describe detalladamente el motivo del reporte (ej. derechos de autor, contenido inapropiado...)"
                  rows={4}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 p-3 text-xs text-white outline-none focus:border-amber-500 resize-none"
                  required
                />

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportView(false)}
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 text-xs font-bold text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReport || !reportReason.trim()}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-black hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{submittingReport ? 'Enviando...' : 'Enviar Reporte'}</span>
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}