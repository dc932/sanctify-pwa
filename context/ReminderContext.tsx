import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/supabase';
import {
  fromReminderRow,
  isReminderDue,
  toDateKey,
  toReminderRow,
  type Reminder,
  type ReminderRow,
} from '@/lib/reminders';
import ReminderToast from '@/components/ReminderToast';

type LoadStatus = 'loading' | 'ready' | 'error';

interface ReminderContextValue {
  reminders: Reminder[];
  status: LoadStatus;
  saveReminder: (reminder: Reminder) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  toggleReminder: (id: string) => Promise<void>;
}

const ReminderContext = createContext<ReminderContextValue | null>(null);

const CHECK_INTERVAL_MS = 30_000;

export function ReminderProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [toastTopic, setToastTopic] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) {
      setReminders([]);
      setStatus('ready');
      return;
    }

    let cancelled = false;
    setStatus('loading');
    supabase
      .from('reminders')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !Array.isArray(data)) {
          console.error('No se pudieron cargar los recordatorios:', error);
          setStatus('error');
          return;
        }
        setReminders((data as ReminderRow[]).map(fromReminderRow));
        setStatus('ready');
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    const checkDue = () => {
      const now = new Date();
      const due = reminders.filter((reminder) => isReminderDue(reminder, now));
      if (due.length === 0) return;

      const today = toDateKey(now);
      due.forEach((reminder) => {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(`Sanctify: ${reminder.topic}`, {
            body: 'Es hora de tu momento de fe.',
            icon: '/Sanctify_Icon_black.png',
          });
        } else {
          setToastTopic(reminder.topic);
        }

        supabase
          .from('reminders')
          .update({ last_fired_date: today })
          .eq('id', reminder.id)
          .then(({ error }) => {
            if (error) console.error('No se pudo registrar el recordatorio:', error);
          });
      });

      const dueIds = new Set(due.map((reminder) => reminder.id));
      setReminders((prev) =>
        prev.map((reminder) => (dueIds.has(reminder.id) ? { ...reminder, lastFiredDate: today } : reminder))
      );
    };

    checkDue();
    const intervalId = window.setInterval(checkDue, CHECK_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [reminders]);

  const dismissToast = useCallback(() => setToastTopic(null), []);

  const saveReminder = useCallback(async (reminder: Reminder) => {
    const { data, error } = await supabase
      .from('reminders')
      .upsert(toReminderRow(reminder))
      .select()
      .single();
    if (error || !data) throw error ?? new Error('Respuesta vacía al guardar el recordatorio');

    const saved = fromReminderRow(data as ReminderRow);
    setReminders((prev) =>
      prev.some((item) => item.id === saved.id)
        ? prev.map((item) => (item.id === saved.id ? saved : item))
        : [...prev, saved]
    );
  }, []);

  const deleteReminder = useCallback(async (id: string) => {
    const { error } = await supabase.from('reminders').delete().eq('id', id);
    if (error) throw error;
    setReminders((prev) => prev.filter((reminder) => reminder.id !== id));
  }, []);

  const toggleReminder = useCallback(
    async (id: string) => {
      const target = reminders.find((reminder) => reminder.id === id);
      if (!target) return;

      const { data, error } = await supabase
        .from('reminders')
        .update({ enabled: !target.enabled })
        .eq('id', id)
        .select()
        .single();
      if (error || !data) throw error ?? new Error('Respuesta vacía al actualizar el recordatorio');

      const updated = fromReminderRow(data as ReminderRow);
      setReminders((prev) => prev.map((reminder) => (reminder.id === id ? updated : reminder)));
    },
    [reminders]
  );

  const value = useMemo(
    () => ({ reminders, status, saveReminder, deleteReminder, toggleReminder }),
    [reminders, status, saveReminder, deleteReminder, toggleReminder]
  );

  return (
    <ReminderContext.Provider value={value}>
      {children}
      {toastTopic && <ReminderToast topic={toastTopic} onDismiss={dismissToast} />}
    </ReminderContext.Provider>
  );
}

export function useReminders() {
  const context = useContext(ReminderContext);
  if (!context) throw new Error('useReminders debe usarse dentro de un ReminderProvider');
  return context;
}
