export interface Reminder {
  id: string;
  topic: string;
  time: string;
  startDate: string;
  recurring: boolean;
  endDate: string | null;
  enabled: boolean;
  lastFiredDate: string | null;
}

export interface ReminderRow {
  id: string;
  topic: string;
  time_of_day: string;
  start_date: string;
  recurring: boolean;
  end_date: string | null;
  enabled: boolean;
  last_fired_date: string | null;
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function fromReminderRow(row: ReminderRow): Reminder {
  return {
    id: row.id,
    topic: row.topic,
    time: row.time_of_day.slice(0, 5),
    startDate: row.start_date,
    recurring: row.recurring,
    endDate: row.end_date,
    enabled: row.enabled,
    lastFiredDate: row.last_fired_date,
  };
}

export function toReminderRow(reminder: Reminder): ReminderRow {
  return {
    id: reminder.id,
    topic: reminder.topic,
    time_of_day: reminder.time,
    start_date: reminder.startDate,
    recurring: reminder.recurring,
    end_date: reminder.endDate,
    enabled: reminder.enabled,
    last_fired_date: reminder.lastFiredDate,
  };
}

export function isReminderDue(reminder: Reminder, now: Date): boolean {
  if (!reminder.enabled) return false;

  const today = toDateKey(now);
  if (reminder.lastFiredDate === today) return false;
  if (today < reminder.startDate) return false;
  if (!reminder.recurring && today !== reminder.startDate) return false;
  if (reminder.recurring && reminder.endDate && today > reminder.endDate) return false;

  const [hour, minute] = reminder.time.split(':').map(Number);
  return now.getHours() * 60 + now.getMinutes() >= hour * 60 + minute;
}

export function formatReminderSchedule(reminder: Reminder): string {
  const formatDate = (key: string) =>
    fromDateKey(key).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

  if (!reminder.recurring) {
    return `Solo el ${formatDate(reminder.startDate)} a las ${reminder.time}`;
  }
  const range = reminder.endDate
    ? `desde el ${formatDate(reminder.startDate)} hasta el ${formatDate(reminder.endDate)}`
    : `desde el ${formatDate(reminder.startDate)}, sin fecha de fin`;
  return `Todos los días ${range} a las ${reminder.time}`;
}
