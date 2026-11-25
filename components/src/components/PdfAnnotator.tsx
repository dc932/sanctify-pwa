import { useState, useEffect, useRef, useCallback, type MouseEvent, type ReactNode } from 'react';
import { Highlighter, StickyNote, MousePointer, Trash2, Save, Check, X } from 'lucide-react';
import { supabase } from '@/supabase';

export type PdfToolMode = 'cursor' | 'highlight' | 'note';

export interface PdfAnnotation {
  id: string;
  user_id: string;
  document_id: string;
  page_number: number;
  kind: 'highlight' | 'note';
  color: string;
  x: number; // 0..1 relativo al ancho de la página
  y: number; // 0..1 relativo al alto de la página
  width: number; // 0..1
  height: number; // 0..1
  comment: string;
}

interface DraftRect {
  startX: number;
  startY: number;
  currX: number;
  currY: number;
}

export function usePdfAnnotations(documentId: string, userId?: string) {
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const storageKey = `sanctify_pdf_ann_${userId || 'guest'}_${documentId}`;

  useEffect(() => {
    let active = true;
    const localRaw = localStorage.getItem(storageKey);
    if (localRaw) {
      try {
        setAnnotations(JSON.parse(localRaw));
      } catch {
        // ignorar JSON corrupto
      }
    }

    if (!userId || !documentId) return;

    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('pdf_annotations')
          .select('*')
          .eq('user_id', userId)
          .eq('document_id', documentId)
          .order('created_at', { ascending: true });

        if (!error && data && active) {
          setAnnotations(data as PdfAnnotation[]);
          localStorage.setItem(storageKey, JSON.stringify(data));
        }
      } catch (err) {
        console.error('Error cargando anotaciones del PDF:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [documentId, userId, storageKey]);

  const persistList = useCallback(
    (next: PdfAnnotation[]) => {
      setAnnotations(next);
      localStorage.setItem(storageKey, JSON.stringify(next));
    },
    [storageKey]
  );

  const addAnnotation = useCallback(
    async (item: Omit<PdfAnnotation, 'id' | 'user_id' | 'document_id'>) => {
      const tempId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `ann_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const fullItem: PdfAnnotation = {
        ...item,
        id: tempId,
        user_id: userId || 'guest',
        document_id: documentId,
      };

      const next = [...annotations, fullItem];
      persistList(next);

      if (!userId) return fullItem;

      setSaving(true);
      try {
        const { data, error } = await supabase
          .from('pdf_annotations')
          .insert({
            user_id: userId,
            document_id: documentId,
            page_number: item.page_number,
            kind: item.kind,
            color: item.color,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            comment: item.comment,
          })
          .select()
          .single();

        if (!error && data) {
          const synced = next.map((a) => (a.id === tempId ? (data as PdfAnnotation) : a));
          persistList(synced);
          setSavedNotice(true);
          setTimeout(() => setSavedNotice(false), 1500);
          return data as PdfAnnotation;
        }
      } catch (err) {
        console.error('Error guardando anotación:', err);
      } finally {
        setSaving(false);
      }

      return fullItem;
    },
    [annotations, documentId, persistList, userId]
  );

  const updateAnnotationComment = useCallback(
    async (id: string, comment: string) => {
      const next = annotations.map((a) => (a.id === id ? { ...a, comment } : a));
      persistList(next);

      if (!userId) return;
      setSaving(true);
      try {
        await supabase
          .from('pdf_annotations')
          .update({ comment, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', userId);
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 1500);
      } catch (err) {
        console.error('Error actualizando nota:', err);
      } finally {
        setSaving(false);
      }
    },
    [annotations, persistList, userId]
  );

  const deleteAnnotation = useCallback(
    async (id: string) => {
      const next = annotations.filter((a) => a.id !== id);
      persistList(next);

      if (!userId) return;
      setSaving(true);
      try {
        await supabase.from('pdf_annotations').delete().eq('id', id).eq('user_id', userId);
      } catch (err) {
        console.error('Error eliminando anotación:', err);
      } finally {
        setSaving(false);
      }
    },
    [annotations, persistList, userId]
  );

  return {
    annotations,
    loading,
    saving,
    savedNotice,
    addAnnotation,
    updateAnnotationComment,
    deleteAnnotation,
  };
}

export function PdfAnnotationToolbar({
  tool,
  onToolChange,
  color,
  onColorChange,
  saving,
  savedNotice,
  annotationsCount,
}: {
  tool: PdfToolMode;
  onToolChange: (t: PdfToolMode) => void;
  color: string;
  onColorChange: (c: string) => void;
  saving: boolean;
  savedNotice: boolean;
  annotationsCount: number;
}) {
  const palette = ['#3CC8F5', '#FACC15', '#4ADE80', '#F472B6'];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/95 px-3 py-2 text-xs text-white">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onToolChange('cursor')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold cursor-pointer ${
            tool === 'cursor'
              ? 'bg-zinc-700 text-white'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          <MousePointer className="h-3.5 w-3.5" />
          <span>Navegar</span>
        </button>

        <button
          type="button"
          onClick={() => onToolChange('highlight')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold cursor-pointer ${
            tool === 'highlight'
              ? 'bg-[#3CC8F5]/20 text-[#3CC8F5] border border-[#3CC8F5]/50'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          <Highlighter className="h-3.5 w-3.5" />
          <span>Subrayar</span>
        </button>

        <button
          type="button"
          onClick={() => onToolChange('note')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold cursor-pointer ${
            tool === 'note'
              ? 'bg-[#3CC8F5]/20 text-[#3CC8F5] border border-[#3CC8F5]/50'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          <StickyNote className="h-3.5 w-3.5" />
          <span>Nota</span>
        </button>

        <div className="ml-2 flex items-center gap-1 border-l border-zinc-800 pl-2">
          {palette.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => onColorChange(hex)}
              aria-label={`Color ${hex}`}
              className={`h-5 w-5 rounded-full cursor-pointer transition-transform ${
                color === hex ? 'scale-110 ring-2 ring-white' : 'opacity-75 hover:opacity-100'
              }`}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-zinc-400">
        <span>{annotationsCount} anotaciones</span>
        {saving && (
          <span className="inline-flex items-center gap-1 text-[#3CC8F5]">
            <Save className="h-3 w-3 animate-pulse" /> Guardando...
          </span>
        )}
        {!saving && savedNotice && (
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <Check className="h-3 w-3" /> Guardado
          </span>
        )}
      </div>
    </div>
  );
}

export function PdfAnnotatedPage({
  pageNumber,
  tool,
  color,
  annotations,
  onCreateAnnotation,
  onUpdateComment,
  onDeleteAnnotation,
  children,
}: {
  pageNumber: number;
  tool: PdfToolMode;
  color: string;
  annotations: PdfAnnotation[];
  onCreateAnnotation: (
    item: Omit<PdfAnnotation, 'id' | 'user_id' | 'document_id'>
  ) => Promise<PdfAnnotation | undefined>;
  onUpdateComment: (id: string, comment: string) => Promise<void>;
  onDeleteAnnotation: (id: string) => Promise<void>;
  children: ReactNode;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<DraftRect | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const pageAnnotations = annotations.filter((a) => a.page_number === pageNumber);

  const getRelativePoint = (e: MouseEvent<HTMLDivElement>) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    return { x, y };
  };

  const handleMouseDown = async (e: MouseEvent<HTMLDivElement>) => {
    if (tool === 'cursor') return;
    if ((e.target as HTMLElement).closest('[data-annotation-item="true"]')) return;

    const pt = getRelativePoint(e);

    if (tool === 'note') {
      const created = await onCreateAnnotation({
        page_number: pageNumber,
        kind: 'note',
        color,
        x: pt.x,
        y: pt.y,
        width: 0,
        height: 0,
        comment: '',
      });
      if (created) {
        setSelectedNoteId(created.id);
        setEditingText(created.comment || '');
      }
      return;
    }

    if (tool === 'highlight') {
      setDraft({ startX: pt.x, startY: pt.y, currX: pt.x, currY: pt.y });
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!draft || tool !== 'highlight') return;
    const pt = getRelativePoint(e);
    setDraft((prev) => (prev ? { ...prev, currX: pt.x, currY: pt.y } : null));
  };

  const handleMouseUp = async () => {
    if (!draft || tool !== 'highlight') return;
    const x = Math.min(draft.startX, draft.currX);
    const y = Math.min(draft.startY, draft.currY);
    const width = Math.abs(draft.currX - draft.startX);
    const height = Math.abs(draft.currY - draft.startY);
    setDraft(null);

    if (width > 0.015 && height > 0.008) {
      await onCreateAnnotation({
        page_number: pageNumber,
        kind: 'highlight',
        color,
        x,
        y,
        width,
        height,
        comment: '',
      });
    }
  };

  const activeNote = pageAnnotations.find((a) => a.id === selectedNoteId && a.kind === 'note');

  return (
    <div className="relative select-none">
      {children}

      <div
        ref={overlayRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`absolute inset-0 z-20 ${
          tool === 'cursor' ? 'pointer-events-none' : 'pointer-events-auto cursor-crosshair'
        }`}
      >
        {pageAnnotations.map((ann) => {
          if (ann.kind === 'highlight') {
            return (
              <div
                key={ann.id}
                data-annotation-item="true"
                style={{
                  left: `${ann.x * 100}%`,
                  top: `${ann.y * 100}%`,
                  width: `${ann.width * 100}%`,
                  height: `${ann.height * 100}%`,
                  backgroundColor: `${ann.color}55`,
                  border: `1px solid ${ann.color}`,
                }}
                className="group/hl pointer-events-auto absolute rounded-sm transition-opacity"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void onDeleteAnnotation(ann.id);
                  }}
                  aria-label="Eliminar subrayado"
                  className="hidden group-hover/hl:flex absolute -top-3 -right-3 h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-red-400 border border-zinc-700 shadow cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          }

          return (
            <button
              key={ann.id}
              type="button"
              data-annotation-item="true"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNoteId(ann.id);
                setEditingText(ann.comment);
              }}
              style={{
                left: `${ann.x * 100}%`,
                top: `${ann.y * 100}%`,
                backgroundColor: ann.color,
              }}
              title={ann.comment || 'Nota del usuario'}
              className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-black font-bold shadow-lg ring-2 ring-black/60 cursor-pointer"
            >
              <StickyNote className="h-3.5 w-3.5" />
            </button>
          );
        })}

        {draft && (
          <div
            style={{
              left: `${Math.min(draft.startX, draft.currX) * 100}%`,
              top: `${Math.min(draft.startY, draft.currY) * 100}%`,
              width: `${Math.abs(draft.currX - draft.startX) * 100}%`,
              height: `${Math.abs(draft.currY - draft.startY) * 100}%`,
              backgroundColor: `${color}45`,
              border: `1px dashed ${color}`,
            }}
            className="pointer-events-none absolute rounded-sm"
          />
        )}

        {activeNote && (
          <div
            data-annotation-item="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              left: `${Math.min(activeNote.x * 100, 65)}%`,
              top: `${Math.min(activeNote.y * 100 + 4, 75)}%`,
            }}
            className="pointer-events-auto absolute z-30 w-64 rounded-2xl border border-zinc-700 bg-zinc-950/95 p-3 text-white shadow-2xl space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#3CC8F5]">Nota en página {pageNumber}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    void onDeleteAnnotation(activeNote.id);
                    setSelectedNoteId(null);
                  }}
                  className="p-1 text-red-400 hover:bg-red-500/10 rounded cursor-pointer"
                  title="Eliminar nota"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedNoteId(null)}
                  className="p-1 text-zinc-400 hover:text-white rounded cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <textarea
              rows={3}
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              placeholder="Escribe tu nota aquí..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-xs text-white outline-none focus:border-[#3CC8F5]"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  void onUpdateComment(activeNote.id, editingText.trim());
                  setSelectedNoteId(null);
                }}
                className="rounded-lg bg-[#3CC8F5] px-3 py-1 text-xs font-bold text-black cursor-pointer"
              >
                Guardar nota
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}