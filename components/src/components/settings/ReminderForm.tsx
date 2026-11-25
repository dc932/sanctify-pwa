import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import CalendarPicker from '@/components/CalendarPicker';
import { toDateKey, type Reminder } from '@/lib/reminders';

interface ReminderFormProps {
  initial: Reminder | null;
  onSave: (reminder: Reminder) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCancel: () => void;
}

const MAX_TOPIC_LENGTH = 40;

const inputClass =
  'mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#3CC8F5]';

const labelClass = 'block text-xs font-medium text-zinc-400';

export default function ReminderForm({ initial, onSave, onDelete, onCancel }: ReminderFormProps) {
  const today = toDateKey(new Date());
  const [topic, setTopic] = useState(initial?.topic ?? '');
  const [time, setTime] = useState(initial?.time ?? '08:00');
  const [startDate, setStartDate] = useState(initial?.startDate ?? today);
  const [recurring, setRecurring] = useState(initial?.recurring ?? false);
  const [hasEndDate, setHasEndDate] = useState(Boolean(initial?.endDate));
  const [endDate, setEndDate] = useState(initial?.endDate ?? startDate);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedTopic = topic.trim();

    if (!trimmedTopic) {
      setError('Escribe el tema del recordatorio.');
      return;
    }
    if (!time) {
      setError('Elige una hora.');
      return;
    }
    if (recurring && hasEndDate && endDate < startDate) {
      setError('La fecha de fin no puede ser anterior a la de inicio.');
      return;
    }

    setError('');
    setBusy(true);
    try {
      await onSave({
        id: initial?.id ?? crypto.randomUUID(),
        topic: trimmedTopic,
        time,
        startDate,
        recurring,
        endDate: recurring && hasEndDate ? endDate : null,
        enabled: initial?.enabled ?? true,
        lastFiredDate: initial?.lastFiredDate ?? null,
      });
    } catch (err) {
      console.error('Error al guardar el recordatorio:', err);
      setError('No pudimos guardar el recordatorio. Inténtalo de nuevo.');
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    setBusy(true);
    try {
      await onDelete(id);
    } catch (err) {
      console.error('Error al eliminar el recordatorio:', err);
      setError('No pudimos eliminar el recordatorio. Inténtalo de nuevo.');
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div>
        <label htmlFor="reminder-topic" className={labelClass}>
          Tema
        </label>
        <input
          id="reminder-topic"
          type="text"
          value={topic}
          maxLength={MAX_TOPIC_LENGTH}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Ej. Lectio Divina, Oración de la noche"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="reminder-time" className={labelClass}>
          Hora
        </label>
        <input
          id="reminder-time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className={`${inputClass} [color-scheme:dark]`}
        />
      </div>

      <div className="space-y-2">
        <p className={labelClass}>Fecha de inicio</p>
        <CalendarPicker
          value={startDate}
          minDate={initial ? undefined : today}
          onChange={(key) => {
            setStartDate(key);
            if (endDate < key) setEndDate(key);
          }}
        />
      </div>

      <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <label className="flex cursor-pointer items-center gap-3 text-xs font-bold text-white">
          <input
            type="checkbox"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
            className="h-4 w-4 accent-[#3CC8F5]"
          />
          Repetir todos los días
        </label>

        {recurring && (
          <div className="space-y-3 border-t border-zinc-800 pt-3">
            <p className={labelClass}>Termina</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: false, label: 'Nunca' },
                { value: true, label: 'En una fecha' },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  aria-pressed={hasEndDate === option.value}
                  onClick={() => setHasEndDate(option.value)}
                  className={`rounded-xl border py-2 text-xs font-bold transition-colors cursor-pointer ${
                    hasEndDate === option.value
                      ? 'border-[#3CC8F5] bg-[#3CC8F5]/10 text-[#3CC8F5]'
                      : 'border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {hasEndDate && (
              <CalendarPicker value={endDate} minDate={startDate} onChange={setEndDate} />
            )}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs font-medium text-red-400">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-zinc-700 py-3 text-xs font-bold text-white transition-colors hover:border-zinc-500 cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy}
          className="flex-1 rounded-xl bg-[#3CC8F5] py-3 text-xs font-bold text-black transition-colors hover:bg-[#32b2dc] disabled:opacity-60 cursor-pointer"
        >
          {busy ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {initial && (
        <div className="border-t border-zinc-800 pt-4">
          {confirmDelete ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-zinc-400">Se eliminará este recordatorio.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-xl px-3 py-2 text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(initial.id)}
                  disabled={busy}
                  className="rounded-xl bg-red-500 px-3 py-2 text-xs font-bold text-white hover:bg-red-600 cursor-pointer"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/10 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar recordatorio
            </button>
          )}
        </div>
      )}
    </form>
  );
}
