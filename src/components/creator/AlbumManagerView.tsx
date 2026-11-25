import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Layers,
  Sparkles,
  X,
  MoreVertical,
  Edit3,
  Image as ImageIcon,
  Upload,
} from 'lucide-react';
import { supabase } from '../../supabase';
import { uploadToR2 } from '../../r2';
import { ACC } from './types';

type ContainerType = 'album' | 'podcast' | 'category';

const DEFAULT_ARTWORK =
  'https://images.pexels.com/photos/426976/pexels-photo-426976.jpeg?auto=compress&cs=tinysrgb&w=600';
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export default function AlbumManagerView() {
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Formulario de creación
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [type, setType] = useState<ContainerType>('album');

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>(DEFAULT_ARTWORK);
  const [thumbnailFileName, setThumbnailFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Menús y modales de edición
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Edición de portada de álbum existente
  const [editingArtworkAlbum, setEditingArtworkAlbum] = useState<any | null>(null);
  const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null);
  const [editThumbnailFileName, setEditThumbnailFileName] = useState('');
  const [updatingArtwork, setUpdatingArtwork] = useState(false);

  // Edición completa de datos del álbum
  const [editingDetailsAlbum, setEditingDetailsAlbum] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editType, setEditType] = useState<ContainerType>('album');
  const [updatingDetails, setUpdatingDetails] = useState(false);

  const fetchAlbums = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('playlists_albums')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlbums(data || []);
    } catch (err) {
      console.error('Error al cargar álbumes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  const validateImageFile = (file: File): boolean => {
    if (!file.type.startsWith('image/')) {
      alert('Selecciona un archivo de imagen válido.');
      return false;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      alert('La imagen no debe superar los 5 MB.');
      return false;
    }
    return true;
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    isEditing: boolean = false
  ) => {
    const file = e.target.files?.[0];
    if (!file || !validateImageFile(file)) return;

    if (isEditing) {
      setEditThumbnailFile(file);
      setEditThumbnailFileName(file.name);
    } else {
      setThumbnailFile(file);
      setThumbnailFileName(file.name);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      alert('El título es obligatorio.');
      return;
    }

    setSubmitting(true);
    try {
      let finalArtworkUrl = DEFAULT_ARTWORK;
      if (thumbnailFile instanceof File) {
        finalArtworkUrl = await uploadToR2(thumbnailFile, 'artwork');
      }

      const { data, error } = await supabase
        .from('playlists_albums')
        .insert({
          title: cleanTitle,
          description: description.trim(),
          author: author.trim(),
          type,
          artwork_url: finalArtworkUrl,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setAlbums((prev) => [data, ...prev]);
      } else {
        await fetchAlbums();
      }

      setTitle('');
      setDescription('');
      setAuthor('');
      setThumbnailFile(null);
      setThumbnailPreview(DEFAULT_ARTWORK);
      setThumbnailFileName('');
      setIsCreating(false);
    } catch (err: any) {
      console.error('Error al crear álbum:', err);
      alert('Error al guardar: ' + (err?.message || 'Error de permisos o red'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAlbum = async (id: string) => {
    setActiveMenuId(null);
    if (!confirm('¿Estás seguro de eliminar este contenedor? Las pistas asociadas quedarán sin álbum.')) {
      return;
    }

    try {
      const { error } = await supabase.from('playlists_albums').delete().eq('id', id);
      if (error) throw error;
      setAlbums((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      console.error('Error al eliminar:', err);
      alert('No se pudo eliminar el álbum.');
    }
  };

  const handleUpdateArtwork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArtworkAlbum) return;

    setUpdatingArtwork(true);
    try {
      const newArtworkUrl =
        editThumbnailFile instanceof File
          ? await uploadToR2(editThumbnailFile, 'artwork')
          : editingArtworkAlbum.artwork_url || DEFAULT_ARTWORK;

      const { error } = await supabase
        .from('playlists_albums')
        .update({ artwork_url: newArtworkUrl })
        .eq('id', editingArtworkAlbum.id);

      if (error) throw error;

      setAlbums((prev) =>
        prev.map((a) =>
          a.id === editingArtworkAlbum.id ? { ...a, artwork_url: newArtworkUrl } : a
        )
      );
      setEditingArtworkAlbum(null);
      setEditThumbnailFile(null);
      setEditThumbnailFileName('');
      alert('¡Portada actualizada con éxito!');
    } catch (err: any) {
      console.error('Error al actualizar portada:', err);
      alert('No se pudo actualizar la portada.');
    } finally {
      setUpdatingArtwork(false);
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = editTitle.trim();
    if (!editingDetailsAlbum || !cleanTitle) {
      alert('El título es obligatorio.');
      return;
    }

    setUpdatingDetails(true);
    try {
      const updates = {
        title: cleanTitle,
        description: editDescription.trim(),
        author: editAuthor.trim(),
        type: editType,
      };

      const { error } = await supabase
        .from('playlists_albums')
        .update(updates)
        .eq('id', editingDetailsAlbum.id);

      if (error) throw error;

      setAlbums((prev) =>
        prev.map((a) => (a.id === editingDetailsAlbum.id ? { ...a, ...updates } : a))
      );

      setEditingDetailsAlbum(null);
      alert('¡Detalles actualizados con éxito!');
    } catch (err: any) {
      console.error('Error al actualizar detalles:', err);
      alert('No se pudieron actualizar los datos.');
    } finally {
      setUpdatingDetails(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5" style={{ color: ACC }} /> Gestión de Álbumes y Podcasts
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Crea álbumes para agrupar tus pistas relacionadas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreating((prev) => !prev)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-black transition-transform hover:scale-105 cursor-pointer"
          style={{ background: ACC }}
        >
          {isCreating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isCreating ? 'Cancelar' : 'Nuevo Álbum / Podcast'}
        </button>
      </div>

      {isCreating && (
        <form
          onSubmit={handleCreateAlbum}
          className="rounded-2xl border border-zinc-800 bg-[#121214] p-5 space-y-4"
        >
          <h3 className="font-bold text-white text-sm">Crear nuevo contenedor</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Título
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Cuaresma en Oración"
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#3CC8F5]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Tipo de Contenedor
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ContainerType)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#3CC8F5]"
              >
                <option value="album">Álbum Musical</option>
                <option value="podcast">Podcast / Serie</option>
                <option value="category">Categoría Temática</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Autor / Creador
            </label>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Ej. Comunidad San José"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#3CC8F5]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Portada del Álbum (Archivo)
            </label>
            <div className="flex items-center gap-3">
              <img
                src={thumbnailPreview}
                alt="Vista previa de portada"
                className="h-12 w-12 rounded-xl object-cover border border-zinc-700 shrink-0"
              />
              <label className="flex items-center gap-2 cursor-pointer flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 hover:text-white">
                <Upload className="h-4 w-4 text-[#3CC8F5] shrink-0" />
                <span className="truncate">
                  {thumbnailFileName || 'Seleccionar archivo de imagen'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, false)}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Breve reseña del álbum o podcast..."
              className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#3CC8F5]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-black transition-transform hover:scale-[1.01] disabled:opacity-50 cursor-pointer"
            style={{ background: ACC }}
          >
            {submitting ? (
              'Guardando contenedor...'
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Guardar Álbum
              </>
            )}
          </button>
        </form>
      )}

      {editingArtworkAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={handleUpdateArtwork}
            className="w-full max-w-md rounded-2xl bg-[#121214] border border-zinc-800 p-5 space-y-4"
          >
            <h3 className="font-bold text-white text-sm">
              Cambiar portada de: {editingArtworkAlbum.title}
            </h3>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Nuevo Archivo de Imagen
              </label>
              <label className="flex items-center gap-2 cursor-pointer w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 hover:text-white">
                <Upload className="h-4 w-4 text-[#3CC8F5]" />
                <span className="truncate">
                  {editThumbnailFileName || 'Seleccionar archivo'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, true)}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditingArtworkAlbum(null);
                  setEditThumbnailFile(null);
                  setEditThumbnailFileName('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={updatingArtwork}
                className="px-4 py-2 rounded-xl text-xs font-bold text-black disabled:opacity-50 cursor-pointer"
                style={{ background: ACC }}
              >
                {updatingArtwork ? 'Subiendo...' : 'Actualizar Portada'}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingDetailsAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={handleUpdateDetails}
            className="w-full max-w-lg rounded-2xl bg-[#121214] border border-zinc-800 p-5 space-y-4"
          >
            <h3 className="font-bold text-white text-sm">
              Editar contenedor: {editingDetailsAlbum.title}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Título
                </label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#3CC8F5]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Tipo de Contenedor
                </label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as ContainerType)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#3CC8F5]"
                >
                  <option value="album">Álbum Musical</option>
                  <option value="podcast">Podcast / Serie</option>
                  <option value="category">Categoría Temática</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Autor / Creador
              </label>
              <input
                value={editAuthor}
                onChange={(e) => setEditAuthor(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#3CC8F5]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Descripción
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#3CC8F5]"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setEditingDetailsAlbum(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={updatingDetails}
                className="px-4 py-2 rounded-xl text-xs font-bold text-black disabled:opacity-50 cursor-pointer"
                style={{ background: ACC }}
              >
                {updatingDetails ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-xs text-zinc-500">Cargando álbumes...</div>
      ) : albums.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/40">
          <Layers className="mx-auto h-10 w-10 text-zinc-600 mb-2" />
          <p className="text-zinc-400 text-sm">No has creado ningún álbum o podcast todavía.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {albums.map((album) => {
            const validArtwork =
              album.artwork_url &&
              (album.artwork_url.startsWith('http') ||
                album.artwork_url.startsWith('data:image'))
                ? album.artwork_url
                : DEFAULT_ARTWORK;

            return (
              <div
                key={album.id}
                className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-[#121214] p-4 relative group"
              >
                <img
                  src={validArtwork}
                  alt={album.title}
                  className="w-16 h-16 rounded-xl object-cover shrink-0 border border-white/10"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#3CC8F5]">
                    {album.type}
                  </span>
                  <h4 className="text-sm font-bold text-white truncate">{album.title}</h4>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    {album.author || 'Sanctify'}
                  </p>
                  {album.description && (
                    <p className="text-[11px] text-zinc-500 truncate mt-1">
                      {album.description}
                    </p>
                  )}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveMenuId(activeMenuId === album.id ? null : album.id)
                    }
                    className="h-8 w-8 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center hover:bg-zinc-700 hover:text-white cursor-pointer"
                    title="Opciones"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {activeMenuId === album.id && (
                    <div className="absolute right-0 top-10 w-48 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl py-1.5 z-20">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuId(null);
                          setEditingDetailsAlbum(album);
                          setEditTitle(album.title || '');
                          setEditDescription(album.description || '');
                          setEditAuthor(album.author || '');
                          setEditType(album.type || 'album');
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2 cursor-pointer"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-[#3CC8F5]" /> Editar datos generales
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuId(null);
                          setEditingArtworkAlbum(album);
                          setEditThumbnailFile(null);
                          setEditThumbnailFileName('');
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2 cursor-pointer"
                      >
                        <ImageIcon className="h-3.5 w-3.5 text-[#3CC8F5]" /> Cambiar portada
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteAlbum(album.id)}
                        className="w-full px-4 py-2 text-left text-xs font-medium text-red-400 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer"
                      >
                        Eliminar contenedor
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}