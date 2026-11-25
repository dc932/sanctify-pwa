import { useState, useEffect } from 'react';
import { Pencil, Plus, Bell, Loader2, MessageSquare, ShieldAlert, CheckCheck, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import ReminderForm from '@/components/settings/ReminderForm';
import ToggleSwitch from '@/components/settings/ToggleSwitch';
import { useReminders } from '@/context/ReminderContext';
import { formatReminderSchedule, type Reminder } from '@/lib/reminders';
import { supabase } from '@/supabase';
import { useAuth } from '@/components/AuthContext';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

const supportsNotifications = typeof window !== 'undefined' && 'Notification' in window;

export default function NotificationSettings({ session: propSession }: { session?: any }) {
  const { session: authSession } = useAuth();
  const session = propSession || authSession;

  const { reminders, status, saveReminder, deleteReminder, toggleReminder } = useReminders();
  const [editing, setEditing] = useState<Reminder | 'new' | null>(null);
  const [actionError, setActionError] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  
  // Estados para el Buzón y control de mensajes expandidos
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [permission, setPermission] = useState<NotificationPermission>(
    supportsNotifications ? Notification.permission : 'denied'
  );

  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
    }
  }, [session]);

  const fetchNotifications = async () => {
    if (!session?.user) return;
    try {
      setLoadingNotifications(true);
      const { data, error } = await supabase
        .from('creator_notifications')
        .select('*')
        .eq('recipient_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setNotifications(data);
    } catch (err) {
      console.error('Error al cargar notificaciones del buzón:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleOpenMessage = async (notif: NotificationItem) => {
    // Alternar expansión
    const isExpanding = expandedId !== notif.id;
    setExpandedId(isExpanding ? notif.id : null);

    // Si no está leído, marcarlo automáticamente como leído al abrirlo
    if (!notif.read && isExpanding) {
      try {
        const { error } = await supabase
          .from('creator_notifications')
          .update({ read: true })
          .eq('id', notif.id);

        if (error) throw error;

        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
      } catch (err) {
        console.error('Error al marcar como leída:', err);
      }
    }
  };

  const deleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Evita que se abra el acordeón al borrar
    try {
      const { error } = await supabase
        .from('creator_notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      console.error('Error al eliminar notificación:', err);
    }
  };

  const requestPermission = async () => {
    if (!supportsNotifications) return;
    const res = await Notification.requestPermission();
    setPermission(res);
  };

  const handleSave = async (reminder: Reminder) => {
    await saveReminder(reminder);
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    await deleteReminder(id);
    setEditing(null);
  };

  const handleToggle = async (id: string) => {
    setActionError('');
    setTogglingId(id);
    try {
      await toggleReminder(id);
    } catch (err) {
      console.error('Error al actualizar el recordatorio:', err);
      setActionError('No pudimos actualizar ese recordatorio. Inténtalo de nuevo.');
    } finally {
      setTogglingId(null);
    }
  };

  if (editing) {
    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          {editing === 'new' ? 'Nuevo recordatorio' : 'Editar recordatorio'}
        </h3>
        <ReminderForm
          initial={editing === 'new' ? null : editing}
          onSave={handleSave}
          onDelete={handleDelete}
          onCancel={() => setEditing(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* BUZÓN DE MENSAJES Y RETROALIMENTACIÓN DE ADMINISTRACIÓN */}
      <div className="space-y-4 rounded-3xl border border-zinc-800 bg-[#121214] p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3CC8F5]/10 text-[#3CC8F5]">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Buzón de Mensajes y Retroalimentación</h3>
              <p className="text-[11px] text-zinc-400">Haz clic en cualquier mensaje para ver el motivo completo del rechazo.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchNotifications}
            className="text-[11px] font-bold text-[#3CC8F5] hover:underline cursor-pointer bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl"
          >
            Actualizar
          </button>
        </div>

        {loadingNotifications ? (
          <p className="py-6 text-center text-xs text-zinc-500 animate-pulse">Cargando buzón de mensajes...</p>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center rounded-2xl border border-zinc-800/60 bg-zinc-900/40">
            <MessageSquare className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
            <p className="text-xs font-medium text-zinc-400">No tienes mensajes nuevos en tu buzón.</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
            {notifications.map((notif) => {
              const isExpanded = expandedId === notif.id;
              return (
                <div
                  key={notif.id}
                  onClick={() => handleOpenMessage(notif)}
                  className={`rounded-2xl border p-4 transition-all cursor-pointer ${
                    notif.read
                      ? 'border-zinc-800/80 bg-zinc-950/40 text-zinc-400'
                      : 'border-[#3CC8F5]/40 bg-[#3CC8F5]/5 text-white shadow-lg'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ShieldAlert className={`h-4 w-4 shrink-0 ${notif.type === 'content_rejected' ? 'text-red-400' : 'text-[#3CC8F5]'}`} />
                        <h4 className="font-bold text-xs text-white truncate">{notif.title}</h4>
                        {!notif.read && (
                          <span className="rounded-full bg-[#3CC8F5] px-2 py-0.5 text-[9px] font-extrabold text-black uppercase tracking-wider">
                            Nuevo
                          </span>
                        )}
                      </div>
                      <span className="block text-[10px] text-zinc-500 pl-6">
                        {new Date(notif.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => deleteNotification(e, notif.id)}
                        className="flex items-center gap-1 text-[11px] font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-xl transition-all cursor-pointer border border-red-500/20"
                        title="Eliminar mensaje"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                    </div>
                  </div>

                  {/* Contenido expandido con el mensaje de rechazo completo */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-2 animate-in fade-in duration-150">
                      <p className="text-xs text-zinc-200 leading-relaxed bg-black/30 p-3 rounded-xl border border-zinc-800">
                        <strong className="text-amber-400 block mb-1">Motivo del administrador:</strong>
                        {notif.message}
                      </p>
                      <div className="flex items-center justify-end">
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCheck className="h-3.5 w-3.5" /> Leído
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Estado de Permisos de Notificación */}
      <div className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-sm">
        <Bell className="mt-0.5 h-4 w-4 shrink-0 text-[#3CC8F5]" />
        <div className="min-w-0 flex-1 space-y-2">
          {permission === 'granted' ? (
            <p className="text-xs text-zinc-300 font-medium">Las notificaciones del navegador están activas y listas.</p>
          ) : permission === 'default' ? (
            <>
              <p className="text-xs text-zinc-300">Activa las notificaciones del navegador para recibir avisos espirituales fuera de la app.</p>
              <button
                type="button"
                onClick={requestPermission}
                className="rounded-xl bg-[#3CC8F5] px-3.5 py-2 text-[11px] font-bold text-black transition-all hover:bg-[#32b2dc] hover:scale-[1.02] cursor-pointer shadow-md shadow-[#3CC8F5]/10"
              >
                Activar notificaciones
              </button>
            </>
          ) : (
            <p className="text-xs text-zinc-400 leading-relaxed">
              Las notificaciones están bloqueadas en tu navegador. No te preocupes, tus recordatorios seguirán funcionando dentro de la app.
            </p>
          )}
        </div>
      </div>

      {/* Lista de Recordatorios */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Tus recordatorios</h3>
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="flex items-center gap-1.5 rounded-xl border border-[#3CC8F5]/40 px-3 py-1.5 text-[11px] font-bold text-[#3CC8F5] transition-all hover:bg-[#3CC8F5] hover:text-black cursor-pointer shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo recordatorio
          </button>
        </div>

        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-10 space-y-2 text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#3CC8F5]" />
            <p className="text-xs">Cargando recordatorios...</p>
          </div>
        )}

        {status === 'error' && (
          <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
            No pudimos cargar tus recordatorios. Recarga la página para intentarlo de nuevo.
          </p>
        )}

        {actionError && (
          <p role="alert" className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs font-medium text-red-400">{actionError}</p>
        )}

        {status === 'ready' && reminders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center space-y-2">
            <Bell className="mx-auto h-6 w-6 text-zinc-600" />
            <p className="text-xs font-semibold text-zinc-400">Aún no tienes recordatorios creados</p>
            <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">Programa espacios de oración o lectura para acompañar tu día.</p>
          </div>
        ) : status === 'ready' && (
          <ul className="space-y-2.5">
            {reminders.map((reminder) => {
              const isToggling = togglingId === reminder.id;
              return (
                <li
                  key={reminder.id}
                  className={`flex items-center gap-3 rounded-2xl border transition-all p-4 ${
                    reminder.enabled ? 'border-zinc-800 bg-zinc-900/60 shadow-md' : 'border-zinc-900 bg-zinc-950/40 opacity-75'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-xs font-bold ${reminder.enabled ? 'text-white' : 'text-zinc-400'}`}>
                      {reminder.topic}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-400 font-medium">
                      {formatReminderSchedule(reminder)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditing(reminder)}
                    aria-label={`Editar ${reminder.topic}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>

                  <div className="relative">
                    {isToggling && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full z-10">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3CC8F5]" />
                      </div>
                    )}
                    <ToggleSwitch
                      checked={reminder.enabled}
                      onChange={() => handleToggle(reminder.id)}
                      label={`Activar recordatorio ${reminder.topic}`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}