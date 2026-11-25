import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Heart,
  Edit3,
  MessageSquare,
  X,
  Upload,
  Sparkles,
  Send,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUp,
  ArrowDown,
  CalendarArrowDown,
  CalendarArrowUp,
  ListOrdered,
} from 'lucide-react';
import { supabase } from '../../supabase';
import { uploadToR2 } from '../../r2';
import { ACC } from './types';
import { useAudio } from '@/context/AudioContext';

interface CreatorContentItem {
  id: string;
  user_id: string;
  title: string;
  description: string;
  file_url: string;
  artwork_url: string;
  category: string;
  status: 'published' | 'under_review' | 'draft' | 'rejected';
  bible_verse: string;
  created_at: string;
}

type StatusFilter = 'all' | 'published' | 'under_review' | 'draft' | 'rejected';
type ContentCategoryFilter = 'all' | 'music' | 'podcast' | 'blog' | 'video' | 'shorts';
type SortMode = 'default' | 'alpha_asc' | 'alpha_desc' | 'date_desc' | 'date_asc';

const PAGE_SIZE = 9;
const DEFAULT_ARTWORK =
  'https://images.pexels.com/photos/426976/pexels-photo-426976.jpeg?auto=compress&cs=tinysrgb&w=600';

function matchesContentCategory(rawCat: string | undefined, filterCat: ContentCategoryFilter): boolean {
  if (filterCat === 'all') return true;
  const val = (rawCat || '').toLowerCase().trim();
  if (filterCat === 'music') {
    return val === 'music' || val === 'música' || val === 'musica' || val === 'audio';
  }
  if (filterCat === 'podcast') {
    return val === 'podcast' || val === 'podcasts';
  }
  if (filterCat === 'blog') {
    return val === 'blog' || val === 'lectura' || val === 'lecturas';
  }
  if (filterCat === 'video') {
    return val === 'video' || val === 'videos';
  }
  if (filterCat === 'shorts') {
    return val === 'short' || val === 'shorts';
  }
  return true;
}

export default function LibraryView() {
  const [contentList, setContentList] = useState<CreatorContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');

  // Buscador, categoría y ordenamiento
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ContentCategoryFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Estados de Paginación
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Estados para modales de edición y feedback
  const [editingContent, setEditingContent] = useState<CreatorContentItem | null>(null);
  const [feedbackModalContent, setFeedbackModalContent] = useState<CreatorContentItem | null>(null);
  const [rejectionFeedback, setRejectionFeedback] = useState<string>('');
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  // Campos del formulario de edición
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [editCoverName, setEditCoverName] = useState('');
  const [editMediaFile, setEditMediaFile] = useState<File | null>(null);
  const [editMediaName, setEditMediaName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { favorites, toggleFavorite } = useAudio();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    void fetchUserContent(0, filter);
  }, [filter]);

  const fetchUserContent = async (pageIndex: number, currentFilter: StatusFilter) => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('creator_content')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (currentFilter !== 'all') {
        query = query.eq('status', currentFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (data) {
        setContentList(data);
        setHasMore(data.length === PAGE_SIZE);
        setPage(pageIndex);
      }
    } catch (err: any) {
      console.error('Error al cargar la biblioteca:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const visibleContent = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const matched = contentList.filter((item) => {
      if (!matchesContentCategory(item.category, categoryFilter)) return false;
      if (!q) return true;
      return (
        (item.title || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q) ||
        (item.bible_verse || '').toLowerCase().includes(q)
      );
    });

    if (sortMode === 'default') return matched;

    if (sortMode === 'alpha_asc') {
      return [...matched].sort((a, b) =>
        (a.title || '').localeCompare(b.title || '', 'es', { sensitivity: 'base', numeric: true })
      );
    }

    if (sortMode === 'alpha_desc') {
      return [...matched].sort((a, b) =>
        (b.title || '').localeCompare(a.title || '', 'es', { sensitivity: 'base', numeric: true })
      );
    }

    const dir = sortMode === 'date_desc' ? -1 : 1;
    return [...matched].sort((a, b) => {
      const tsA = a.created_at ? Date.parse(a.created_at) : NaN;
      const tsB = b.created_at ? Date.parse(b.created_at) : NaN;
      if (!Number.isNaN(tsA) && !Number.isNaN(tsB) && tsA !== tsB) {
        return (tsA - tsB) * dir;
      }
      return (a.title || '').localeCompare(b.title || '', 'es', {
        sensitivity: 'base',
        numeric: true,
      });
    });
  }, [contentList, searchQuery, categoryFilter, sortMode]);

  const checkIsPdf = (item: CreatorContentItem) => {
    const fileUrl = (item.file_url || '').toLowerCase();
    const rawCat = (item.category || '').toLowerCase().trim();
    const title = (item.title || '').toLowerCase();
    return (
      fileUrl.includes('.pdf') ||
      rawCat === 'blog' ||
      rawCat === 'lectura' ||
      rawCat === 'lecturas' ||
      title.includes('.pdf')
    );
  };

  const handleItemClick = (item: CreatorContentItem) => {
    if (checkIsPdf(item)) {
      window.dispatchEvent(new CustomEvent('open-lecturas-view', { detail: item }));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta publicación?')) return;

    try {
      const { error } = await supabase.from('creator_content').delete().eq('id', id);
      if (error) throw error;
      setContentList((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const handleProcessUpdate = async (sendToReview: boolean = false) => {
    if (!editingContent || !editTitle.trim()) {
      alert('El título es obligatorio.');
      return;
    }

    setSubmitting(true);
    try {
      let artworkUrl = editingContent.artwork_url || '';
      if (editCoverFile) {
        try {
          artworkUrl = await uploadToR2(editCoverFile, 'covers');
        } catch (r2Err) {
          console.error('Error al subir portada a R2:', r2Err);
          alert('No se pudo subir la nueva imagen de portada. Se mantendrá la anterior.');
        }
      }

      let mediaUrl = editingContent.file_url || '';
      let nextCategory = editCategory.trim();
      if (editMediaFile) {
        try {
          const fileExtension = editMediaFile.name.split('.').pop()?.toLowerCase();
          const isPdf = fileExtension === 'pdf' || editMediaFile.type === 'application/pdf';
          const folder = isPdf ? 'readings' : 'content';
          mediaUrl = await uploadToR2(editMediaFile, folder);

          if (isPdf && nextCategory.toLowerCase() === 'music') {
            nextCategory = 'blog';
            setEditCategory('blog');
          }
        } catch (r2Err) {
          console.error('Error al subir archivo a R2:', r2Err);
          alert('No se pudo subir el nuevo archivo multimedia. Se mantendrá el anterior.');
        }
      }

      const updatePayload: any = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        category: nextCategory,
        artwork_url: artworkUrl,
        file_url: mediaUrl,
      };

      if (sendToReview) {
        updatePayload.status = 'under_review';
      }

      const { error } = await supabase
        .from('creator_content')
        .update(updatePayload)
        .eq('id', editingContent.id);

      if (error) throw error;

      setContentList((prev) =>
        prev.map((item) =>
          item.id === editingContent.id ? { ...item, ...updatePayload } : item
        )
      );

      setEditingContent(null);
      setEditCoverFile(null);
      setEditCoverName('');
      setEditMediaFile(null);
      setEditMediaName('');
      alert(
        sendToReview
          ? '¡Contenido actualizado y enviado a revisión con éxito!'
          : '¡Contenido actualizado con éxito!'
      );
    } catch (err: any) {
      console.error('Error al actualizar contenido:', err);
      alert('No se pudo actualizar el contenido: ' + (err.message || 'Error desconocido'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCoverChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditCoverFile(file);
    setEditCoverName(file.name);
  };

  const handleMediaChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditMediaFile(file);
    setEditMediaName(file.name);
  };

  const handleViewFeedback = async (content: CreatorContentItem) => {
    setFeedbackModalContent(content);
    setLoadingFeedback(true);
    setRejectionFeedback('Buscando comentarios de revisión...');

    try {
      const { data, error } = await supabase
        .from('creator_notifications')
        .select('message, metadata')
        .eq('user_id', content.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const related = data?.find(
        (n) =>
          n.message.includes(content.title) ||
          (n.metadata && n.metadata.content_id === content.id)
      );

      if (related) {
        setRejectionFeedback(related.message);
      } else {
        setRejectionFeedback(
          'No se encontraron observaciones específicas registradas para este elemento. El contenido pudo ser rechazado por revisión general.'
        );
      }
    } catch (err) {
      console.error('Error al cargar feedback:', err);
      setRejectionFeedback('Error al recuperar la retroalimentación.');
    } finally {
      setLoadingFeedback(false);
    }
  };

  const categoryButtons: { id: ContentCategoryFilter; label: string }[] = [
    { id: 'all', label: 'Todas las categorías' },
    { id: 'music', label: 'Música' },
    { id: 'podcast', label: 'Podcast' },
    { id: 'blog', label: 'Lecturas' },
    { id: 'video', label: 'Videos' },
    { id: 'shorts', label: 'Shorts' },
  ];

  const sortButtons: { id: SortMode; label: string; icon: typeof ListOrdered }[] = [
    { id: 'default', label: 'Orden', icon: ListOrdered },
    { id: 'alpha_asc', label: 'A–Z', icon: ArrowUp },
    { id: 'alpha_desc', label: 'Z–A', icon: ArrowDown },
    { id: 'date_desc', label: 'Fecha: Mayor a menor', icon: CalendarArrowDown },
    { id: 'date_asc', label: 'Fecha: Menor a mayor', icon: CalendarArrowUp },
  ];

  return (
    <div className="space-y-6">
      {/* Cabecera, Filtros de Estado, Buscador, Categorías y Orden */}
      <div className="space-y-4 rounded-2xl border border-zinc-800 bg-[#121214] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Mi Biblioteca de Publicaciones</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Administra todo tu contenido subido y su estado de revisión.
            </p>
          </div>

          {/* Botones de Filtro de Estado */}
          <div className="flex flex-wrap gap-1.5 bg-zinc-900/80 p-1.5 rounded-xl border border-zinc-800">
            {(['all', 'published', 'under_review', 'draft', 'rejected'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setPage(0);
                  setFilter(tab);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filter === tab ? 'bg-[#3CC8F5] text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab === 'all' && 'Todas'}
                {tab === 'published' && 'Publicadas'}
                {tab === 'under_review' && 'En revisión'}
                {tab === 'draft' && 'Borradores'}
                {tab === 'rejected' && 'Rechazadas'}
              </button>
            ))}
          </div>
        </div>

        {/* Buscador con lupa */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, descripción, categoría o cita bíblica..."
            aria-label="Buscar publicaciones"
            className="w-full rounded-full border border-zinc-700/80 bg-zinc-900 pl-10 pr-9 py-2 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-[#3CC8F5]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filtros de Categoría + Ordenamiento */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {categoryButtons.map((cat) => {
              const active = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-[#3CC8F5]/20 text-[#3CC8F5] border border-[#3CC8F5]'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {sortButtons.map(({ id, label, icon: Icon }) => {
              const active = sortMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSortMode(id)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-[#3CC8F5]/20 text-[#3CC8F5] border border-[#3CC8F5]'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lista de Contenidos */}
      {loading ? (
        <div className="py-20 text-center text-xs text-zinc-500">Cargando tus publicaciones...</div>
      ) : visibleContent.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#121214] py-16 text-center space-y-2">
          <FileText className="mx-auto h-10 w-10 text-zinc-600 mb-2" />
          <p className="text-sm font-bold text-zinc-300">
            {searchQuery.trim() || categoryFilter !== 'all'
              ? 'No hay publicaciones que coincidan con el filtro'
              : 'No hay publicaciones en esta sección'}
          </p>
          <p className="text-xs text-zinc-500">
            {searchQuery.trim() || categoryFilter !== 'all'
              ? 'Prueba limpiando la búsqueda o cambiando la categoría.'
              : 'Sube nuevo contenido desde la pestaña correspondiente.'}
          </p>
          {(searchQuery.trim() || categoryFilter !== 'all' || sortMode !== 'default') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setSortMode('default');
              }}
              className="mt-2 inline-block text-xs font-bold text-[#3CC8F5] underline cursor-pointer"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3">
            {visibleContent.map((item) => {
              const isFavorite = favorites.has(item.id);
              const isPdf = checkIsPdf(item);

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border bg-[#121214] p-4 transition-all cursor-pointer ${
                    isPdf
                      ? 'border-emerald-500/30 hover:border-emerald-500/60'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative h-14 w-14 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 shrink-0 flex items-center justify-center">
                      {isPdf && !item.artwork_url ? (
                        <FileText className="h-7 w-7 text-emerald-400" />
                      ) : (
                        <img
                          src={item.artwork_url || DEFAULT_ARTWORK}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isPdf
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                              : 'text-[#3CC8F5] bg-[#3CC8F5]/10'
                          }`}
                        >
                          {isPdf ? 'Lectura / PDF' : item.category}
                        </span>
                        {item.bible_verse && (
                          <span className="text-[10px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">
                            📖 {item.bible_verse}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white truncate mt-1">{item.title}</h3>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">
                        {item.description || 'Sin descripción'}
                      </p>
                    </div>
                  </div>

                  <div
                    className="flex items-center flex-wrap justify-between sm:justify-end gap-2.5 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-800/60"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.status === 'published' && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Publicado
                      </span>
                    )}
                    {item.status === 'under_review' && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Clock className="h-3.5 w-3.5" /> En revisión
                      </span>
                    )}
                    {item.status === 'draft' && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-zinc-700/30 text-zinc-400 border border-zinc-700/40">
                        <AlertCircle className="h-3.5 w-3.5" /> Borrador
                      </span>
                    )}
                    {item.status === 'rejected' && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                        <AlertCircle className="h-3.5 w-3.5" /> Rechazado
                      </span>
                    )}

                    {item.status === 'rejected' && (
                      <button
                        type="button"
                        onClick={() => void handleViewFeedback(item)}
                        className="flex h-9 px-3 items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors text-xs font-semibold cursor-pointer"
                        title="Ver comentarios de rechazo"
                      >
                        <MessageSquare className="h-4 w-4" /> Comentarios
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setEditingContent(item);
                        setEditTitle(item.title || '');
                        setEditDescription(item.description || '');
                        setEditCategory(item.category || '');
                        setEditCoverFile(null);
                        setEditCoverName('');
                        setEditMediaFile(null);
                        setEditMediaName('');
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors cursor-pointer"
                      title="Editar detalles y portada"
                    >
                      <Edit3 className="h-4 w-4 text-[#3CC8F5]" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item.id);
                      }}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 transition-colors hover:scale-110 cursor-pointer ${
                        isFavorite
                          ? 'text-[#3CC8F5] border-[#3CC8F5]/30'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                      title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                    >
                      <Heart className={`h-4 w-4 ${isFavorite ? 'fill-[#3CC8F5]' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDelete(item.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-500/30 transition-colors cursor-pointer"
                      title="Eliminar publicación"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={() => void fetchUserContent(page - 1, filter)}
              disabled={page === 0 || loading}
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-40 cursor-pointer transition-all"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
            <span className="text-xs text-zinc-400 font-medium">Página {page + 1}</span>
            <button
              type="button"
              onClick={() => void fetchUserContent(page + 1, filter)}
              disabled={!hasMore || loading}
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-40 cursor-pointer transition-all"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}

      {editingContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#121214] border border-zinc-800 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">
                Editar publicación: {editingContent.title}
              </h3>
              <button
                type="button"
                onClick={() => setEditingContent(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

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
                  Categoría
                </label>
                <input
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#3CC8F5]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Imagen de Portada
              </label>
              <label className="flex items-center gap-2 cursor-pointer w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 hover:text-white">
                <Upload className="h-4 w-4 text-[#3CC8F5]" />
                <span className="truncate">
                  {editCoverName ? editCoverName : 'Cambiar imagen de portada (opcional)'}
                </span>
                <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
              </label>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Reemplazar Archivo Existente (Audio/PDF)
              </label>
              <label className="flex items-center gap-2 cursor-pointer w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 hover:text-white">
                <Upload className="h-4 w-4 text-[#3CC8F5]" />
                <span className="truncate">
                  {editMediaName ? editMediaName : 'Seleccionar nuevo archivo (opcional)'}
                </span>
                <input type="file" onChange={handleMediaChange} className="hidden" />
              </label>
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

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingContent(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800 cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleProcessUpdate(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-black cursor-pointer disabled:opacity-50 flex items-center gap-2"
                style={{ background: ACC }}
              >
                {submitting ? (
                  'Guardando...'
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" /> Guardar Cambios
                  </>
                )}
              </button>

              {(editingContent.status === 'draft' || editingContent.status === 'rejected') && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleProcessUpdate(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#3CC8F5]/20 border border-[#3CC8F5]/40 text-[#3CC8F5] hover:bg-[#3CC8F5]/30 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="h-3.5 w-3.5" /> Volver a publicar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {feedbackModalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#121214] border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-amber-400" /> Motivo de Rechazo
              </h3>
              <button
                type="button"
                onClick={() => setFeedbackModalContent(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-300 leading-relaxed min-h-[100px] flex items-center justify-center">
              {loadingFeedback ? (
                <span className="text-zinc-500 animate-pulse">{rejectionFeedback}</span>
              ) : (
                <p>{rejectionFeedback}</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setFeedbackModalContent(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-zinc-800 hover:bg-zinc-700 cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}