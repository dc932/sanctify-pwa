import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  FileText,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  RefreshCw,
  ArrowLeft,
  Heart,
  Eye,
  X,
  Download,
  Filter,
  CheckSquare,
  Square,
  Music,
  Film,
} from 'lucide-react';
import { supabase } from '../../supabase';

interface ReviewItem {
  id: string;
  user_id: string;
  title: string;
  description: string;
  file_url: string;
  artwork_url: string;
  category: string;
  status: 'under_review' | 'published' | 'draft' | 'rejected';
  bible_verse: string;
  created_at: string;
  feedback?: string;
}

interface CreatorProfile {
  id: string;
  user_id?: string;
  full_name: string;
  ministry_name: string;
  email?: string;
  status: string;
  created_at: string;
}

interface Donation {
  id: string;
  user_id?: string | null;
  donor_name?: string | null;
  donor_email?: string | null;
  amount?: number;
  currency?: string | null;
  message?: string;
  thanked?: boolean;
  created_at: string;
}

interface ProfileInfo {
  id: string;
  full_name?: string | null;
  email?: string | null;
}

type AdminTab = 'content' | 'creators' | 'donations';
type PreviewKind = 'image' | 'audio' | 'video' | 'pdf';

interface AdminReviewViewProps {
  onClose?: () => void;
}

const DEFAULT_ARTWORK =
  'https://images.pexels.com/photos/426976/pexels-photo-426976.jpeg?auto=compress&cs=tinysrgb&w=600';

function escapeCsvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsvFile(filename: string, headers: string[], rows: unknown[][]) {
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.setAttribute('download', filename);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function detectPreviewKind(url: string, mimeType?: string): PreviewKind {
  const cleanUrl = url.split('?')[0].toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  if (mime.startsWith('image/') || /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(cleanUrl)) {
    return 'image';
  }
  if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac|opus)$/i.test(cleanUrl)) {
    return 'audio';
  }
  if (mime.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogv)$/i.test(cleanUrl)) {
    return 'video';
  }
  return 'pdf';
}

export default function AdminReviewView({ onClose }: AdminReviewViewProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('content');

  // Estados para Contenido
  const [pendingItems, setPendingItems] = useState<ReviewItem[]>([]);
  const [loadingContent, setLoadingContent] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedContentIds, setSelectedContentIds] = useState<Set<string>>(new Set());
  const [bulkContentLoading, setBulkContentLoading] = useState(false);

  // Rechazo individual o en bulk
  const [rejectTargets, setRejectTargets] = useState<ReviewItem[]>([]);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Estados para el Modal Visor de Archivos (Audio, Video, Imagen, PDF)
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [selectedFileTitle, setSelectedFileTitle] = useState<string>('');
  const [selectedFileArtwork, setSelectedFileArtwork] = useState<string>(DEFAULT_ARTWORK);
  const [previewKind, setPreviewKind] = useState<PreviewKind>('pdf');
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);

  // Estados para Creadores
  const [pendingCreators, setPendingCreators] = useState<CreatorProfile[]>([]);
  const [loadingCreators, setLoadingCreators] = useState(false);
  const [selectedCreatorIds, setSelectedCreatorIds] = useState<Set<string>>(new Set());
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [bulkCreatorLoading, setBulkCreatorLoading] = useState(false);

  // Estados para Donaciones y Perfiles de apoyo
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(false);
  const [profilesMap, setProfilesMap] = useState<Record<string, ProfileInfo>>({});

  useEffect(() => {
    void Promise.all([
      fetchPendingContent(),
      fetchPendingCreators(),
      fetchDonations(),
      fetchProfilesLookup(),
    ]);
  }, []);

  useEffect(() => {
    return () => {
      if (selectedFileUrl && selectedFileUrl.startsWith('blob:')) {
        URL.revokeObjectURL(selectedFileUrl);
      }
    };
  }, [selectedFileUrl]);

  const fetchProfilesLookup = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email');
      if (error) throw error;
      if (data) {
        const lookup: Record<string, ProfileInfo> = {};
        for (const prof of data) {
          lookup[prof.id] = prof;
        }
        setProfilesMap(lookup);
      }
    } catch (err: any) {
      console.warn('No se pudieron cargar perfiles auxiliares:', err?.message || err);
    }
  };

  const fetchPendingContent = async () => {
    try {
      setLoadingContent(true);
      const { data, error } = await supabase
        .from('creator_content')
        .select('*')
        .eq('status', 'under_review')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setPendingItems(data);
    } catch (err: any) {
      console.error('Error al cargar contenido para revisión:', err.message);
    } finally {
      setLoadingContent(false);
    }
  };

  const fetchPendingCreators = async () => {
    try {
      setLoadingCreators(true);
      const { data, error } = await supabase
        .from('creator_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setPendingCreators(data);
    } catch (err: any) {
      console.error('Error al cargar perfiles de creadores:', err.message);
    } finally {
      setLoadingCreators(false);
    }
  };

  const fetchDonations = async () => {
    try {
      setLoadingDonations(true);
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setDonations(data);
    } catch (err: any) {
      console.error('Error al cargar donaciones:', err.message);
    } finally {
      setLoadingDonations(false);
    }
  };

  const categories = useMemo(() => {
    const unique = new Set<string>();
    for (const item of pendingItems) {
      const cat = (item.category || 'sin categoría').trim();
      if (cat) unique.add(cat);
    }
    return ['all', ...Array.from(unique)];
  }, [pendingItems]);

  const filteredContent = useMemo(() => {
    if (selectedCategory === 'all') return pendingItems;
    return pendingItems.filter(
      (item) => (item.category || 'sin categoría').trim() === selectedCategory
    );
  }, [pendingItems, selectedCategory]);

  const allFilteredContentSelected =
    filteredContent.length > 0 &&
    filteredContent.every((item) => selectedContentIds.has(item.id));

  const toggleSelectContentItem = (id: string) => {
    setSelectedContentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFilteredContent = () => {
    const visibleIds = filteredContent.map((item) => item.id);
    setSelectedContentIds((prev) => {
      const next = new Set(prev);
      if (allFilteredContentSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const resolveDonorName = (donation: Donation) => {
    const profile = donation.user_id ? profilesMap[donation.user_id] : undefined;
    return (
      donation.donor_name?.trim() ||
      profile?.full_name?.trim() ||
      donation.donor_email?.split('@')[0] ||
      profile?.email?.split('@')[0] ||
      'Anónimo / Usuario sin nombre'
    );
  };

  const resolveDonorEmail = (donation: Donation) => {
    const profile = donation.user_id ? profilesMap[donation.user_id] : undefined;
    return donation.donor_email || profile?.email || '';
  };

  const handleOpenViewer = async (item: ReviewItem) => {
    if (!item.file_url) {
      alert('El archivo multimedia no está disponible.');
      return;
    }

    if (selectedFileUrl && selectedFileUrl.startsWith('blob:')) {
      URL.revokeObjectURL(selectedFileUrl);
    }

    const kind = detectPreviewKind(item.file_url);
    setSelectedFileTitle(item.title);
    setSelectedFileArtwork(item.artwork_url || DEFAULT_ARTWORK);
    setPreviewKind(kind);

    // Audio, video e imagen se reproducen directo con URL (streaming nativo para MP3/MP4)
    if (kind === 'image' || kind === 'audio' || kind === 'video') {
      setSelectedFileUrl(item.file_url);
      return;
    }

    setLoadingFileId(item.id);
    try {
      const response = await fetch(item.file_url);
      const blob = await response.blob();
      const detectedFromBlob = detectPreviewKind(item.file_url, blob.type);
      setPreviewKind(detectedFromBlob);

      if (detectedFromBlob === 'audio' || detectedFromBlob === 'video' || detectedFromBlob === 'image') {
        setSelectedFileUrl(item.file_url);
        return;
      }

      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      setSelectedFileUrl(URL.createObjectURL(pdfBlob));
    } catch (err) {
      console.warn('No se pudo procesar mediante Blob, usando URL directa:', err);
      setSelectedFileUrl(item.file_url);
    } finally {
      setLoadingFileId(null);
    }
  };

  const closeViewerModal = () => {
    if (selectedFileUrl && selectedFileUrl.startsWith('blob:')) {
      URL.revokeObjectURL(selectedFileUrl);
    }
    setSelectedFileUrl(null);
    setSelectedFileTitle('');
  };

  const handleApproveContent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('creator_content')
        .update({ status: 'published', feedback: null })
        .eq('id', id);

      if (error) throw error;

      setPendingItems((prev) => prev.filter((item) => item.id !== id));
      setSelectedContentIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      alert('Publicación aprobada y publicada con éxito.');
    } catch (err: any) {
      alert('Error al aprobar contenido: ' + err.message);
    }
  };

  const handleBulkApproveContent = async () => {
    const ids = Array.from(selectedContentIds);
    if (ids.length === 0) return;

    try {
      setBulkContentLoading(true);
      const { error } = await supabase
        .from('creator_content')
        .update({ status: 'published', feedback: null })
        .in('id', ids);

      if (error) throw error;

      setPendingItems((prev) => prev.filter((item) => !selectedContentIds.has(item.id)));
      setSelectedContentIds(new Set());
      alert(`${ids.length} publicación(es) aprobada(s) y publicada(s) con éxito.`);
    } catch (err: any) {
      alert('Error al aprobar en lote: ' + err.message);
    } finally {
      setBulkContentLoading(false);
    }
  };

  const openRejectModalForItems = (items: ReviewItem[]) => {
    if (items.length === 0) return;
    setRejectTargets(items);
    setFeedbackText('');
  };

  const handleConfirmRejectContent = async () => {
    if (rejectTargets.length === 0) return;
    if (!feedbackText.trim()) {
      alert('Por favor, ingresa un comentario explicando la razón del rechazo.');
      return;
    }

    const reason = feedbackText.trim();
    const targetIds = rejectTargets.map((item) => item.id);

    try {
      setSubmitting(true);

      const { error: updateError } = await supabase
        .from('creator_content')
        .update({
          status: 'draft',
          feedback: reason,
        })
        .in('id', targetIds);

      if (updateError) throw updateError;

      const notifications = rejectTargets.map((item) => ({
        recipient_id: item.user_id,
        creator_id: item.user_id,
        title: `Contenido rechazado: "${item.title}"`,
        message: `Motivo del rechazo: ${reason}`,
        type: 'content_rejected',
        read: false,
      }));

      const { error: notifError } = await supabase
        .from('creator_notifications')
        .insert(notifications);

      if (notifError) {
        console.warn('Advertencia al enviar notificación:', notifError.message);
      }

      setPendingItems((prev) => prev.filter((item) => !targetIds.includes(item.id)));
      setSelectedContentIds((prev) => {
        const next = new Set(prev);
        targetIds.forEach((id) => next.delete(id));
        return next;
      });
      setRejectTargets([]);
      setFeedbackText('');
      alert(
        `${targetIds.length} publicación(es) rechazada(s) y notificaciones enviadas al buzón del creador.`
      );
    } catch (err: any) {
      alert('Error al rechazar contenido: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelectCreatorItem = (id: string) => {
    setSelectedCreatorIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApproveCreator = async (creatorId: string) => {
    try {
      setActionLoadingId(creatorId);

      const { error: updateError } = await supabase
        .from('creator_profiles')
        .update({ status: 'approved' })
        .eq('id', creatorId);

      if (updateError) throw updateError;

      await supabase.from('creator_notifications').insert([
        {
          recipient_id: creatorId,
          creator_id: creatorId,
          title: '¡Solicitud de Creador Aprobada!',
          message:
            'Felicidades. Tu solicitud ha sido aprobada por el equipo pastoral. Ya tienes acceso completo al Creator Studio para publicar tu contenido.',
          type: 'creator_approved',
          read: false,
        },
      ]);

      setPendingCreators((prev) =>
        prev.map((c) => (c.id === creatorId ? { ...c, status: 'approved' } : c))
      );

      alert('Solicitud de creador aprobada y notificada con éxito.');
    } catch (err: any) {
      alert('Error al aprobar creador: ' + (err.message || err));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBulkApproveCreators = async () => {
    const ids = Array.from(selectedCreatorIds);
    if (ids.length === 0) return;

    try {
      setBulkCreatorLoading(true);
      const { error: updateError } = await supabase
        .from('creator_profiles')
        .update({ status: 'approved' })
        .in('id', ids);

      if (updateError) throw updateError;

      const notifications = ids.map((creatorId) => ({
        recipient_id: creatorId,
        creator_id: creatorId,
        title: '¡Solicitud de Creador Aprobada!',
        message:
          'Felicidades. Tu solicitud ha sido aprobada por el equipo pastoral. Ya tienes acceso completo al Creator Studio para publicar tu contenido.',
        type: 'creator_approved',
        read: false,
      }));

      await supabase.from('creator_notifications').insert(notifications);

      setPendingCreators((prev) =>
        prev.map((c) => (selectedCreatorIds.has(c.id) ? { ...c, status: 'approved' } : c))
      );
      setSelectedCreatorIds(new Set());
      alert(`${ids.length} solicitud(es) de creador aprobada(s) con éxito.`);
    } catch (err: any) {
      alert('Error al aprobar solicitudes en lote: ' + err.message);
    } finally {
      setBulkCreatorLoading(false);
    }
  };

  const handleExportCreatorsCsv = () => {
    const dateStamp = new Date().toISOString().slice(0, 10);
    const sourceList =
      selectedCreatorIds.size > 0
        ? pendingCreators.filter((c) => selectedCreatorIds.has(c.id))
        : pendingCreators;

    const headers = [
      'ID Solicitud',
      'Nombre Completo',
      'Ministerio / Canal',
      'Correo',
      'Estado',
      'Fecha de Solicitud',
    ];

    const rows = sourceList.map((creator) => {
      const profile = creator.user_id ? profilesMap[creator.user_id] : profilesMap[creator.id];
      return [
        creator.id,
        creator.full_name || profile?.full_name || 'Sin nombre',
        creator.ministry_name || '',
        creator.email || profile?.email || '',
        creator.status || 'pending',
        creator.created_at || '',
      ];
    });

    downloadCsvFile(`solicitudes-creadores-${dateStamp}.csv`, headers, rows);
  };

  const handleExportDonationsCsv = () => {
    const dateStamp = new Date().toISOString().slice(0, 10);
    const headers = [
      'ID Donación',
      'Nombre o Usuario',
      'Correo',
      'Monto',
      'Moneda',
      'Mensaje',
      'Agradecido',
      'Fecha',
    ];

    const rows = donations.map((donation) => [
      donation.id,
      resolveDonorName(donation),
      resolveDonorEmail(donation),
      donation.amount ?? '',
      donation.currency || 'USD',
      donation.message || '',
      donation.thanked ? 'Sí' : 'No',
      donation.created_at || '',
    ]);

    downloadCsvFile(`donaciones-${dateStamp}.csv`, headers, rows);
  };

  const handleThankDonation = async (donationId: string, recipientUserId?: string | null) => {
    try {
      const { error: donationError } = await supabase
        .from('donations')
        .update({
          thanked: true,
          thanked_at: new Date().toISOString(),
        })
        .eq('id', donationId);

      if (donationError) throw donationError;

      if (recipientUserId) {
        await supabase.from('creator_notifications').insert({
          recipient_id: recipientUserId,
          creator_id: recipientUserId,
          title: '¡Donativo Agradecido!',
          message:
            'El equipo de administración ha enviado un agradecimiento especial por tu donativo.',
          type: 'donation_thanked',
          read: false,
        });
      }

      setDonations((prev) =>
        prev.map((d) => (d.id === donationId ? { ...d, thanked: true } : d))
      );

      alert('¡Agradecimiento enviado con éxito al donante!');
    } catch (err: any) {
      alert('Error al agradecer el donativo: ' + err.message);
    }
  };

  const selectedContentItems = useMemo(
    () => pendingItems.filter((item) => selectedContentIds.has(item.id)),
    [pendingItems, selectedContentIds]
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0B] text-zinc-900 dark:text-white p-4 sm:p-6 pb-32">
      <div className="max-w-6xl mx-auto space-y-6">
        {onClose && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-all hover:border-[#3CC8F5] hover:text-[#3CC8F5] cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al Catálogo
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121214] p-5">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-500" /> Panel de Administración General
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Gestiona las publicaciones pendientes, las solicitudes de creadores y los donativos de la comunidad.
          </p>

          <div className="mt-4 flex gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('content')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'content'
                  ? 'bg-amber-500 text-black'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <FileText className="h-4 w-4" /> Contenido Pendiente ({pendingItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('creators')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'creators'
                  ? 'bg-amber-500 text-black'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <UserCheck className="h-4 w-4" /> Solicitudes de Creadores (
              {pendingCreators.filter((c) => c.status !== 'approved').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('donations')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'donations'
                  ? 'bg-amber-500 text-black'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <Heart className="h-4 w-4" /> Donaciones ({donations.filter((d) => !d.thanked).length})
            </button>
          </div>
        </div>

        {/* VISTA 1: REVISIÓN DE CONTENIDO */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121214] p-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <Filter className="h-4 w-4 text-amber-500 shrink-0" />
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-[#3CC8F5] text-black'
                          : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:text-white'
                      }`}
                    >
                      {cat === 'all' ? 'Todas las categorías' : cat.toUpperCase()}
                    </button>
                  ))}
                </div>

                {filteredContent.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectAllFilteredContent}
                    className="flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-bold hover:border-[#3CC8F5] cursor-pointer"
                  >
                    {allFilteredContentSelected ? (
                      <CheckSquare className="h-4 w-4 text-[#3CC8F5]" />
                    ) : (
                      <Square className="h-4 w-4 text-zinc-400" />
                    )}
                    {allFilteredContentSelected
                      ? 'Deseleccionar visibles'
                      : `Seleccionar visibles (${filteredContent.length})`}
                  </button>
                )}
              </div>

              {selectedContentIds.size > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#3CC8F5]/40 bg-[#3CC8F5]/10 px-4 py-2.5">
                  <span className="text-xs font-bold text-[#3CC8F5]">
                    {selectedContentIds.size} archivo(s) seleccionado(s)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={bulkContentLoading}
                      onClick={handleBulkApproveContent}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-black hover:bg-emerald-400 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {bulkContentLoading ? 'Aprobando...' : 'Aprobar seleccionados'}
                    </button>
                    <button
                      type="button"
                      disabled={bulkContentLoading}
                      onClick={() => openRejectModalForItems(selectedContentItems)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" /> Rechazar seleccionados
                    </button>
                  </div>
                </div>
              )}
            </div>

            {loadingContent ? (
              <div className="py-20 text-center text-xs text-zinc-500">
                Cargando elementos pendientes...
              </div>
            ) : filteredContent.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121214] py-16 text-center">
                <FileText className="mx-auto h-10 w-10 text-zinc-400 dark:text-zinc-600 mb-3" />
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-300">
                  No hay contenido pendiente en esta vista
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Prueba cambiando de categoría o actualiza el listado.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredContent.map((item) => {
                  const isChecked = selectedContentIds.has(item.id);
                  const itemKind = detectPreviewKind(item.file_url || '');
                  const isItemLoading = loadingFileId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border p-5 transition-all ${
                        isChecked
                          ? 'border-[#3CC8F5] bg-[#3CC8F5]/5'
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121214]'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectContentItem(item.id)}
                          aria-label={`Seleccionar ${item.title}`}
                          className="mt-1 h-4 w-4 accent-[#3CC8F5] rounded cursor-pointer shrink-0"
                        />
                        <img
                          src={item.artwork_url || DEFAULT_ARTWORK}
                          alt={item.title}
                          className="h-20 w-20 rounded-xl object-cover border border-zinc-200 dark:border-zinc-800 shrink-0"
                        />
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                              {item.category}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-md">
                              {itemKind}
                            </span>
                            {item.bible_verse && (
                              <span className="text-[10px] text-zinc-600 dark:text-zinc-400 bg-zinc-200 dark:bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-300 dark:border-zinc-800">
                                📖 {item.bible_verse}
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-zinc-900 dark:text-white truncate">
                            {item.title}
                          </h3>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                            {item.description || 'Sin descripción'}
                          </p>

                          <button
                            type="button"
                            onClick={() => handleOpenViewer(item)}
                            disabled={isItemLoading}
                            className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-[#3CC8F5] bg-[#3CC8F5]/10 hover:bg-[#3CC8F5]/20 px-3 py-1.5 rounded-lg border border-[#3CC8F5]/30 cursor-pointer transition-all disabled:opacity-50"
                          >
                            {itemKind === 'audio' ? (
                              <Music className="h-3.5 w-3.5" />
                            ) : itemKind === 'video' ? (
                              <Film className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                            {isItemLoading
                              ? 'Cargando archivo...'
                              : itemKind === 'audio'
                              ? 'Previsualizar Pista de Audio'
                              : itemKind === 'video'
                              ? 'Previsualizar Video'
                              : 'Revisar y Leer Archivo PDF / Multimedia'}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-zinc-200 dark:border-zinc-800 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleApproveContent(item.id)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-black hover:bg-emerald-400 transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Aprobar
                        </button>
                        <button
                          type="button"
                          onClick={() => openRejectModalForItems([item])}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all cursor-pointer"
                        >
                          <XCircle className="h-4 w-4" /> Rechazar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VISTA 2: SOLICITUDES DE CREADORES */}
        {activeTab === 'creators' && (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121214] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Solicitudes Registradas ({pendingCreators.length})
              </h3>
              <div className="flex items-center gap-2">
                {selectedCreatorIds.size > 0 && (
                  <button
                    type="button"
                    disabled={bulkCreatorLoading}
                    onClick={handleBulkApproveCreators}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-emerald-400 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {bulkCreatorLoading ? 'Aprobando...' : `Aprobar (${selectedCreatorIds.size})`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleExportCreatorsCsv}
                  className="flex items-center gap-1.5 rounded-xl border border-[#3CC8F5]/40 bg-[#3CC8F5]/10 px-3 py-1.5 text-xs font-bold text-[#3CC8F5] hover:bg-[#3CC8F5]/20 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" /> Exportar CSV
                </button>
                <button
                  type="button"
                  onClick={fetchPendingCreators}
                  className="flex items-center gap-1.5 text-xs text-amber-500 hover:underline cursor-pointer px-2 py-1"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingCreators ? 'animate-spin' : ''}`} />{' '}
                  Actualizar
                </button>
              </div>
            </div>

            {loadingCreators ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                Cargando solicitudes de creadores...
              </div>
            ) : pendingCreators.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                No hay solicitudes de creadores registradas.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingCreators.map((creator) => {
                  const isChecked = selectedCreatorIds.has(creator.id);
                  return (
                    <div
                      key={creator.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 p-4 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectCreatorItem(creator.id)}
                          aria-label={`Seleccionar solicitud de ${creator.full_name}`}
                          className="mt-1 h-4 w-4 accent-[#3CC8F5] rounded cursor-pointer"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-zinc-900 dark:text-white text-sm">
                              {creator.full_name}
                            </h4>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${
                                creator.status === 'approved'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}
                            >
                              {creator.status === 'approved' ? 'Aprobado' : 'Pendiente'}
                            </span>
                          </div>
                          <p className="text-xs text-amber-500 font-medium">
                            Ministerio / Canal: {creator.ministry_name}
                          </p>
                          <span className="block text-[10px] text-zinc-500">
                            Solicitado el:{' '}
                            {new Date(creator.created_at).toLocaleDateString('es-MX', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {creator.status === 'approved' ? (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                            <CheckCircle2 className="h-4 w-4" /> Aprobado
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleApproveCreator(creator.id)}
                            disabled={actionLoadingId === creator.id}
                            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {actionLoadingId === creator.id
                              ? 'Aprobando...'
                              : 'Aprobar Solicitud'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VISTA 3: DONACIONES */}
        {activeTab === 'donations' && (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121214] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Historial de Donativos ({donations.length})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportDonationsCsv}
                  className="flex items-center gap-1.5 rounded-xl border border-[#3CC8F5]/40 bg-[#3CC8F5]/10 px-3 py-1.5 text-xs font-bold text-[#3CC8F5] hover:bg-[#3CC8F5]/20 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" /> Exportar CSV
                </button>
                <button
                  type="button"
                  onClick={fetchDonations}
                  className="flex items-center gap-1.5 text-xs text-amber-500 hover:underline cursor-pointer px-2 py-1"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingDonations ? 'animate-spin' : ''}`} />{' '}
                  Actualizar
                </button>
              </div>
            </div>

            {loadingDonations ? (
              <div className="py-12 text-center text-xs text-zinc-500">Cargando donativos...</div>
            ) : donations.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                No hay donativos registrados todavía.
              </div>
            ) : (
              <div className="space-y-3">
                {donations.map((donation) => {
                  const donorLabel = resolveDonorName(donation);
                  const donorEmail = resolveDonorEmail(donation);
                  return (
                    <div
                      key={donation.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 p-4 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-zinc-900 dark:text-white text-sm">
                            {donation.amount
                              ? `$${donation.amount} ${donation.currency || 'USD'}`
                              : 'Donativo'}
                          </h4>
                          <span className="rounded-full bg-[#3CC8F5]/10 text-[#3CC8F5] border border-[#3CC8F5]/20 px-2.5 py-0.5 text-[10px] font-bold">
                            {donorLabel}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${
                              donation.thanked
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}
                          >
                            {donation.thanked ? 'Agradecido ✓' : 'Pendiente de Agradecer'}
                          </span>
                        </div>
                        {donorEmail && (
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {donorEmail}
                          </p>
                        )}
                        {donation.message && (
                          <p className="text-xs text-zinc-300 italic">"{donation.message}"</p>
                        )}
                        <span className="block text-[10px] text-zinc-500">
                          Recibido el:{' '}
                          {new Date(donation.created_at).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {donation.thanked ? (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                            <CheckCircle2 className="h-4 w-4" /> Agradecido
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleThankDonation(donation.id, donation.user_id)}
                            className="flex items-center gap-1.5 rounded-xl bg-[#3CC8F5] px-4 py-2 text-xs font-bold text-black hover:bg-[#32b2dc] transition-all cursor-pointer shadow-md"
                          >
                            <Heart className="h-4 w-4 fill-black" />
                            Agradecer Donativo
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal para enviar retroalimentación al rechazar contenido */}
        {rejectTargets.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#121214] p-6 text-white shadow-2xl">
              <h3 className="text-lg font-bold flex items-center gap-2 text-red-400">
                <MessageSquare className="h-5 w-5" /> Retroalimentación de Rechazo
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                {rejectTargets.length === 1 ? (
                  <>
                    Indica la razón del rechazo para{' '}
                    <strong className="text-white">{rejectTargets[0].title}</strong>.
                  </>
                ) : (
                  <>
                    Indica el motivo del rechazo para los{' '}
                    <strong className="text-white">{rejectTargets.length}</strong> elementos
                    seleccionados.
                  </>
                )}
              </p>

              <textarea
                rows={4}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Ejemplo: El contenido no cumple con las directrices de la comunidad..."
                className="mt-4 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
              />

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectTargets([]);
                    setFeedbackText('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRejectContent}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Guardando...' : 'Confirmar Rechazo'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Visor Integrado para Audio, Video, Imagen o PDF */}
        {selectedFileUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className="w-full max-w-4xl h-[85vh] rounded-2xl border border-zinc-800 bg-[#121214] flex flex-col shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-900/60 gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white">
                    {previewKind === 'audio'
                      ? 'Previsualización de Pista de Audio'
                      : previewKind === 'video'
                      ? 'Previsualización de Video'
                      : 'Visualizador de Documento / Archivo'}
                  </h3>
                  <p className="text-xs text-[#3CC8F5] truncate max-w-xl">{selectedFileTitle}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <a
                    href={selectedFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    Abrir en pestaña externa ↗
                  </a>

                  <button
                    type="button"
                    onClick={closeViewerModal}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 cursor-pointer transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-zinc-950 p-4 relative flex items-center justify-center overflow-auto">
                {previewKind === 'image' && (
                  <img
                    src={selectedFileUrl}
                    alt={selectedFileTitle}
                    className="max-h-full max-w-full object-contain rounded-xl"
                  />
                )}

                {previewKind === 'audio' && (
                  <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-[#18181c] p-6 space-y-4 text-center shadow-xl">
                    <img
                      src={selectedFileArtwork}
                      alt={selectedFileTitle}
                      className="mx-auto h-40 w-40 rounded-2xl object-cover border border-zinc-800 shadow-lg"
                    />
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#3CC8F5]">
                      Pista de Audio en Revisión
                    </p>
                    <h4 className="text-base font-bold text-white truncate">{selectedFileTitle}</h4>
                    <audio
                      src={selectedFileUrl}
                      controls
                      autoPlay
                      preload="metadata"
                      className="w-full"
                    >
                      Tu navegador no soporta la reproducción de audio.
                    </audio>
                  </div>
                )}

                {previewKind === 'video' && (
                  <video
                    src={selectedFileUrl}
                    controls
                    autoPlay
                    playsInline
                    preload="metadata"
                    className="max-h-full w-full max-w-3xl rounded-xl border border-zinc-800 bg-black"
                  >
                    Tu navegador no soporta la reproducción de video.
                  </video>
                )}

                {previewKind === 'pdf' && (
                  <iframe
                    src={`${selectedFileUrl}#view=FitH`}
                    title={selectedFileTitle}
                    className="w-full h-full rounded-xl border border-zinc-800 bg-white"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}