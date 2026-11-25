import { useState, useEffect } from 'react';
import { Plus, FileText, Trash2, Sparkles, X, MoreVertical, Edit3, Upload, File as FileIcon } from 'lucide-react';
import { supabase } from '../../supabase';
import { uploadToR2 } from '../../r2';
import { ACC } from './types';

export default function DocumentManagerView() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Formulario de creación
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Guías');
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Menús y modales de edición
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // Edición de archivo de documento existente
  const [editingFileDoc, setEditingFileDoc] = useState<any | null>(null);
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [editFileName, setEditFileName] = useState('');

  // Edición completa de datos generales
  const [editingDetailsDoc, setEditingDetailsDoc] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editCategory, setEditCategory] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error al cargar documentos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEditing: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isEditing) {
      setEditSelectedFile(file);
      setEditFileName(file.name);
    } else {
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('El título es obligatorio.');
      return;
    }

    setSubmitting(true);
    try {
      let fileUrl = '';
      if (selectedFile) {
        // Sube directamente a Cloudflare R2
        fileUrl = await uploadToR2(selectedFile, 'documents');
      }

      const { error } = await supabase.from('documents').insert({
        title: title.trim(),
        description: description.trim(),
        author: author.trim(),
        category: category.trim(),
        file_url: fileUrl,
        file_name: fileName || 'documento.pdf',
      });

      if (error) throw error;

      setTitle('');
      setDescription('');
      setAuthor('');
      setCategory('Guías');
      setSelectedFile(null);
      setFileName('');
      setIsCreating(false);
      fetchDocuments();
    } catch (err: any) {
      console.error('Error al crear documento:', err);
      alert('Error al guardar: ' + (err.message || 'Error de permisos o red'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    setActiveMenuId(null);
    if (!confirm('¿Estás seguro de eliminar este documento?')) return;

    try {
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) throw error;
      setDocuments(documents.filter((d) => d.id !== id));
    } catch (err: any) {
      console.error('Error al eliminar:', err);
      alert('No se pudo eliminar el documento.');
    }
  };

  const handleUpdateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFileDoc) return;

    try {
      let newFileUrl = editingFileDoc.file_url;
      let newFileName = editingFileDoc.file_name;

      if (editSelectedFile) {
        newFileUrl = await uploadToR2(editSelectedFile, 'documents');
        newFileName = editFileName;
      }

      const { error } = await supabase
        .from('documents')
        .update({ file_url: newFileUrl, file_name: newFileName })
        .eq('id', editingFileDoc.id);

      if (error) throw error;

      setDocuments(documents.map(d => d.id === editingFileDoc.id ? { ...d, file_url: newFileUrl, file_name: newFileName } : d));
      setEditingFileDoc(null);
      setEditSelectedFile(null);
      setEditFileName('');
      alert('¡Archivo actualizado con éxito!');
    } catch (err: any) {
      console.error('Error al actualizar archivo:', err);
      alert('No se pudo actualizar el archivo.');
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDetailsDoc || !editTitle.trim()) {
      alert('El título es obligatorio.');
      return;
    }

    try {
      const { error } = await supabase
        .from('documents')
        .update({
          title: editTitle.trim(),
          description: editDescription.trim(),
          author: editAuthor.trim(),
          category: editCategory.trim(),
        })
        .eq('id', editingDetailsDoc.id);

      if (error) throw error;

      setDocuments(documents.map(d => d.id === editingDetailsDoc.id ? {
        ...d,
        title: editTitle.trim(),
        description: editDescription.trim(),
        author: editAuthor.trim(),
        category: editCategory.trim(),
      } : d));

      setEditingDetailsDoc(null);
      alert('¡Detalles actualizados con éxito!');
    } catch (err: any) {
      console.error('Error al actualizar detalles:', err);
      alert('No se pudieron actualizar los datos.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="h-5 w-5" style={{ color: ACC }} /> Gestión de Documentos y Recursos
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Sube y administra tus documentos PDF, guías y recursos escritos.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-black transition-transform hover:scale-105 cursor-pointer"
          style={{ background: ACC }}
        >
          {isCreating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isCreating ? 'Cancelar' : 'Nuevo Documento'}
        </button>
      </div>

      {/* Formulario de creación */}
      {isCreating && (
        <form onSubmit={handleCreateDocument} className="rounded-2xl border border-zinc-800 bg-[#121214] p-5 space-y-4">
          <h3 className="font-bold text-white text-sm">Subir nuevo documento</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Título</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Guía de Oración PDF"
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#3CC8F5]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Categoría</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ej. Guías, Libros, Formación"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#3CC8F5]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Autor / Creador</label>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Ej. Comunidad San José"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#3CC8F5]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Archivo del Documento (PDF / DOC)</label>
            <label className="flex items-center gap-2 cursor-pointer w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 hover:text-white">
              <Upload className="h-4 w-4 text-[#3CC8F5]" />
              <span className="truncate">{fileName ? fileName : 'Seleccionar archivo (PDF, DOC, etc.)'}</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => handleFileChange(e, false)}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Breve reseña del documento..."
              className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#3CC8F5]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-black transition-transform hover:scale-[1.01] disabled:opacity-50 cursor-pointer"
            style={{ background: ACC }}
          >
            {submitting ? 'Guardando documento...' : <><Sparkles className="h-4 w-4" /> Guardar Documento</>}
          </button>
        </form>
      )}

      {/* Modal para actualizar archivo */}
      {editingFileDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={handleUpdateFile} className="w-full max-w-md rounded-2xl bg-[#121214] border border-zinc-800 p-5 space-y-4">
            <h3 className="font-bold text-white text-sm">Actualizar archivo de: {editingFileDoc.title}</h3>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Nuevo Archivo</label>
              <label className="flex items-center gap-2 cursor-pointer w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 hover:text-white">
                <Upload className="h-4 w-4 text-[#3CC8F5]" />
                <span className="truncate">{editFileName ? editFileName : 'Seleccionar nuevo archivo'}</span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => handleFileChange(e, true)}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setEditingFileDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold text-black cursor-pointer"
                style={{ background: ACC }}
              >
                Actualizar Archivo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal para editar datos generales */}
      {editingDetailsDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={handleUpdateDetails} className="w-full max-w-lg rounded-2xl bg-[#121214] border border-zinc-800 p-5 space-y-4">
            <h3 className="font-bold text-white text-sm">Editar documento: {editingDetailsDoc.title}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Título</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#3CC8F5]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Categoría</label>
                <input
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#3CC8F5]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Autor / Creador</label>
              <input
                value={editAuthor}
                onChange={(e) => setEditAuthor(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#3CC8F5]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Descripción</label>
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
                onClick={() => setEditingDetailsDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold text-black cursor-pointer"
                style={{ background: ACC }}
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Listado de documentos */}
      {loading ? (
        <div className="py-20 text-center text-xs text-zinc-500">Cargando documentos...</div>
      ) : documents.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/40">
          <FileText className="mx-auto h-10 w-10 text-zinc-600 mb-2" />
          <p className="text-zinc-400 text-sm">No has subido ningún documento todavía.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-[#121214] p-4 relative group"
            >
              <div className="w-16 h-16 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 border border-white/10 text-[#3CC8F5]">
                <FileIcon className="h-8 w-8" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#3CC8F5]">
                  {doc.category || 'Documento'}
                </span>
                <h4 className="text-sm font-bold text-white truncate">{doc.title}</h4>
                <p className="text-xs text-zinc-400 truncate mt-0.5">{doc.author || 'Sanctify'}</p>
                <p className="text-[10px] text-zinc-500 truncate mt-0.5">Archivo: {doc.file_name || 'documento'}</p>
              </div>

              <div className="relative">
                <button
                  onClick={() => setActiveMenuId(activeMenuId === doc.id ? null : doc.id)}
                  className="h-8 w-8 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center hover:bg-zinc-700 hover:text-white cursor-pointer"
                  title="Opciones"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {activeMenuId === doc.id && (
                  <div className="absolute right-0 top-10 w-48 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl py-1.5 z-20">
                    <button
                      onClick={() => {
                        setActiveMenuId(null);
                        setEditingDetailsDoc(doc);
                        setEditTitle(doc.title || '');
                        setEditDescription(doc.description || '');
                        setEditAuthor(doc.author || '');
                        setEditCategory(doc.category || '');
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2 cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-[#3CC8F5]" /> Editar datos generales
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenuId(null);
                        setEditingFileDoc(doc);
                        setEditSelectedFile(null);
                        setEditFileName('');
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2 cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5 text-[#3CC8F5]" /> Actualizar archivo
                    </button>
                    
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-red-400 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar documento
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}