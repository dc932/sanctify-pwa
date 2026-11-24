import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  Heart,
  CheckCircle2,
  X,
  RefreshCw,
  MessageSquare,
  ShieldAlert,
  BellOff,
  Trash2,
  CheckSquare,
  Square,
} from 'lucide-react';
import { supabase } from '@/supabase';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  isAdminNotification?: boolean;
}

interface NotificationsPopoverProps {
  session?: any;
}

function makeCompositeKey(item: Pick<NotificationItem, 'id' | 'isAdminNotification'>): string {
  return `${item.isAdminNotification ? 'admin' : 'user'}:${item.id}`;
}

export default function NotificationsPopover({ session }: NotificationsPopoverProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [busyAction, setBusyAction] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const allSelected = useMemo(
    () =>
      notifications.length > 0 &&
      notifications.every((n) => selectedKeys.has(makeCompositeKey(n))),
    [notifications, selectedKeys]
  );

  const fetchNotifications = async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      const userId = session.user.id;

      const [userRes, adminRes] = await Promise.all([
        supabase
          .from('creator_notifications')
          .select('*')
          .or(`recipient_id.eq.${userId},creator_id.eq.${userId}`)
          .order('created_at', { ascending: false }),
        supabase
          .from('admin_notifications')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      if (userRes.error) console.error('Error en creator_notifications:', userRes.error);
      if (adminRes.error) console.error('Error en admin_notifications:', adminRes.error);

      const combined: NotificationItem[] = [
        ...(userRes.data || []).map((n) => ({ ...n, isAdminNotification: false })),
        ...(adminRes.data || []).map((n) => ({ ...n, isAdminNotification: true })),
      ].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setNotifications(combined);
      setSelectedKeys((prev) => {
        const validKeys = new Set(combined.map((item) => makeCompositeKey(item)));
        const next = new Set<string>();
        prev.forEach((key) => {
          if (validKeys.has(key)) next.add(key);
        });
        return next;
      });
    } catch (err) {
      console.error('Error cargando notificaciones unificadas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchNotifications();
  }, [session?.user?.id]);

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 8,
        right: Math.max(12, window.innerWidth - rect.right),
      });
      void fetchNotifications();
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleSelectItem = (item: NotificationItem) => {
    const key = makeCompositeKey(item);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(notifications.map((n) => makeCompositeKey(n))));
    }
  };

  const setReadStateForItems = async (items: NotificationItem[], readValue: boolean) => {
    if (items.length === 0) return;

    const userIds = items.filter((i) => !i.isAdminNotification).map((i) => i.id);
    const adminIds = items.filter((i) => i.isAdminNotification).map((i) => i.id);

    setBusyAction(true);
    try {
      const promises: PromiseLike<any>[] = [];
      if (userIds.length > 0) {
        promises.push(
          supabase.from('creator_notifications').update({ read: readValue }).in('id', userIds)
        );
      }
      if (adminIds.length > 0) {
        promises.push(
          supabase.from('admin_notifications').update({ read: readValue }).in('id', adminIds)
        );
      }

      const results = await Promise.all(promises);
      const firstError = results.find((r) => r?.error)?.error;
      if (firstError) throw firstError;

      const targetKeys = new Set(items.map((i) => makeCompositeKey(i)));
      setNotifications((prev) =>
        prev.map((n) => (targetKeys.has(makeCompositeKey(n)) ? { ...n, read: readValue } : n))
      );
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        targetKeys.forEach((k) => next.delete(k));
        return next;
      });
    } catch (err) {
      console.error('Error al actualizar estado de lectura:', err);
    } finally {
      setBusyAction(false);
    }
  };

  const deleteItems = async (items: NotificationItem[]) => {
    if (items.length === 0) return;

    const userIds = items.filter((i) => !i.isAdminNotification).map((i) => i.id);
    const adminIds = items.filter((i) => i.isAdminNotification).map((i) => i.id);

    setBusyAction(true);
    try {
      const promises: PromiseLike<any>[] = [];
      if (userIds.length > 0) {
        promises.push(supabase.from('creator_notifications').delete().in('id', userIds));
      }
      if (adminIds.length > 0) {
        promises.push(supabase.from('admin_notifications').delete().in('id', adminIds));
      }

      const results = await Promise.all(promises);
      const firstError = results.find((r) => r?.error)?.error;
      if (firstError) throw firstError;

      const targetKeys = new Set(items.map((i) => makeCompositeKey(i)));
      setNotifications((prev) => prev.filter((n) => !targetKeys.has(makeCompositeKey(n))));
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        targetKeys.forEach((k) => next.delete(k));
        return next;
      });
    } catch (err) {
      console.error('Error al borrar notificaciones:', err);
    } finally {
      setBusyAction(false);
    }
  };

  const markAsRead = async (item: NotificationItem) => {
    if (item.read) return;
    await setReadStateForItems([item], true);
  };

  const markAsUnread = async (item: NotificationItem) => {
    if (!item.read) return;
    await setReadStateForItems([item], false);
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0 || !session?.user?.id) return;

    const unreadItems = notifications.filter((n) => !n.read);
    await setReadStateForItems(unreadItems, true);
  };

  const selectedItems = useMemo(
    () => notifications.filter((n) => selectedKeys.has(makeCompositeKey(n))),
    [notifications, selectedKeys]
  );

  return (
    <div className="relative inline-flex items-center shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-black transition-all focus:outline-none shrink-0 dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-white cursor-pointer"
        aria-label="Notificaciones"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              top: `${coords.top}px`,
              right: `${coords.right}px`,
            }}
            className="fixed w-80 sm:w-96 rounded-2xl border border-zinc-800 bg-[#121214] p-4 shadow-2xl z-[99999] animate-in fade-in zoom-in-95 duration-200 text-white"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-[#E0B95B]" />
                <h3 className="font-bold text-white text-sm">Notificaciones</h3>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={markAllAsRead}
                    className="text-[11px] font-semibold text-[#E0B95B] hover:underline cursor-pointer disabled:opacity-50"
                  >
                    Marcar leídas
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!loading && notifications.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-zinc-900/70 border border-zinc-800/80 px-2.5 py-2 text-[11px]">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 font-semibold text-zinc-300 hover:text-white cursor-pointer"
                >
                  {allSelected ? (
                    <CheckSquare className="h-3.5 w-3.5 text-[#3CC8F5]" />
                  ) : (
                    <Square className="h-3.5 w-3.5 text-zinc-500" />
                  )}
                  <span>
                    {allSelected ? 'Deseleccionar' : `Seleccionar (${notifications.length})`}
                  </span>
                </button>

                {selectedItems.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={busyAction}
                      onClick={() => void setReadStateForItems(selectedItems, false)}
                      className="flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1 font-bold text-[#3CC8F5] hover:bg-zinc-700 cursor-pointer disabled:opacity-50"
                      title="Marcar seleccionadas como no leídas"
                    >
                      <BellOff className="h-3 w-3" />
                      No leídas ({selectedItems.length})
                    </button>
                    <button
                      type="button"
                      disabled={busyAction}
                      onClick={() => void deleteItems(selectedItems)}
                      className="flex items-center gap-1 rounded-lg bg-red-500/20 px-2 py-1 font-bold text-red-400 hover:bg-red-500/30 cursor-pointer disabled:opacity-50"
                      title="Borrar seleccionadas en lote"
                    >
                      <Trash2 className="h-3 w-3" />
                      Borrar ({selectedItems.length})
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {loading ? (
                <div className="flex py-8 items-center justify-center text-zinc-500 gap-2 text-xs">
                  <RefreshCw className="h-4 w-4 animate-spin text-[#E0B95B]" />
                  Cargando mensajes...
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
                  <MessageSquare className="h-6 w-6 text-zinc-700" />
                  No tienes notificaciones o agradecimientos aún.
                </div>
              ) : (
                notifications.map((n) => {
                  const key = makeCompositeKey(n);
                  const isChecked = selectedKeys.has(key);

                  return (
                    <div
                      key={key}
                      onClick={() => void markAsRead(n)}
                      className={`p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                        isChecked
                          ? 'border-[#3CC8F5] bg-[#3CC8F5]/10 text-white'
                          : n.read
                          ? 'border-zinc-800/60 bg-zinc-900/30 text-zinc-400'
                          : n.isAdminNotification
                          ? 'border-amber-500/40 bg-amber-500/10 text-white font-medium shadow-sm'
                          : 'border-[#E0B95B]/40 bg-[#E0B95B]/10 text-white font-medium shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => toggleSelectItem(n)}
                            aria-label={`Seleccionar ${n.title}`}
                            className="h-3.5 w-3.5 accent-[#3CC8F5] rounded cursor-pointer shrink-0"
                          />
                          {n.isAdminNotification && (
                            <ShieldAlert className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          )}
                          <span
                            className={`font-bold truncate ${
                              n.isAdminNotification ? 'text-amber-400' : 'text-[#E0B95B]'
                            }`}
                          >
                            {n.title}
                          </span>
                        </div>

                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {n.read && (
                            <button
                              type="button"
                              disabled={busyAction}
                              onClick={() => void markAsUnread(n)}
                              title="Marcar como no leída"
                              className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-[#3CC8F5] transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <BellOff className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyAction}
                            onClick={() => void deleteItems([n])}
                            title="Borrar notificación"
                            className="rounded-md p-1 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          {!n.read && (
                            <span
                              className={`ml-0.5 flex h-2 w-2 rounded-full shrink-0 ${
                                n.isAdminNotification ? 'bg-amber-400' : 'bg-[#E0B95B]'
                              }`}
                            />
                          )}
                        </div>
                      </div>

                      <p className="leading-relaxed whitespace-pre-line text-zinc-300 text-[11px] pl-5">
                        {n.message}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-zinc-800/40 pl-5">
                        <span className="text-[9px] text-zinc-500">
                          {new Date(n.created_at).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {n.read && (
                          <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-semibold">
                            <CheckCircle2 className="h-3 w-3" /> Leída
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}