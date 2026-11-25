import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fromDateKey, toDateKey } from '@/lib/reminders';

interface CalendarPickerProps {
  value: string | null;
  onChange: (dateKey: string) => void;
  minDate?: string;
}

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export default function CalendarPicker({ value, onChange, minDate }: CalendarPickerProps) {
  const initial = value ? fromDateKey(value) : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const todayKey = toDateKey(new Date());
  const firstWeekday = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => toDateKey(new Date(viewYear, viewMonth, index + 1))),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Mes anterior"
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-xs font-bold capitalize text-white">{monthLabel}</p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Mes siguiente"
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day) => (
          <span key={day} className="py-1 text-[10px] font-bold text-zinc-500">
            {day}
          </span>
        ))}
        {cells.map((key, index) => {
          if (!key) return <span key={`empty-${index}`} />;

          const isSelected = key === value;
          const isToday = key === todayKey;
          const isDisabled = Boolean(minDate && key < minDate);

          return (
            <button
              key={key}
              type="button"
              disabled={isDisabled}
              aria-pressed={isSelected}
              onClick={() => onChange(key)}
              className={`aspect-square w-full rounded-xl text-xs font-semibold transition-colors ${
                isSelected
                  ? 'bg-[#3CC8F5] text-black'
                  : isDisabled
                    ? 'text-zinc-700 cursor-not-allowed'
                    : `text-zinc-200 hover:bg-zinc-800 cursor-pointer ${isToday ? 'ring-1 ring-[#3CC8F5]/60' : ''}`
              }`}
            >
              {fromDateKey(key).getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
