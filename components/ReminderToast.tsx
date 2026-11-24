import { useEffect } from 'react';
import { Bell, X } from 'lucide-react';

interface ReminderToastProps {
  topic: string;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 8000;

export default function ReminderToast({ topic, onDismiss }: ReminderToastProps) {
  useEffect(() => {
    const timeoutId = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timeoutId);
  }, [onDismiss]);

  return (
    <div
      role="status"
      className="fixed bottom-24 left-4 right-4 z-[100000] flex items-start gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#151517] p-4 shadow-2xl sm:left-auto sm:right-6 sm:w-80"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#3CC8F5]/15 text-[#3CC8F5]">
        <Bell className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-zinc-900 dark:text-white">Recordatorio</p>
        <p className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-400">Es hora de: {topic}</p>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Cerrar recordatorio"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
