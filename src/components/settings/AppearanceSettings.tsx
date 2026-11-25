import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

// Si tu hook useTheme soporta 'system', puedes agregarlo aquí. Si solo maneja 'dark' | 'light', puedes adaptarlo fácilmente.
const OPTIONS = [
  { id: 'dark', label: 'Oscuro', icon: Moon, description: 'Ideal para ambientes con poca luz' },
  { id: 'light', label: 'Claro', icon: Sun, description: 'Mayor claridad de lectura' },
] as const;

export default function AppearanceSettings() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="space-y-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Apariencia de la interfaz</h3>
        <p className="text-[11px] text-zinc-400">Selecciona el modo visual con el que prefieres vivir tu experiencia en Sanctify.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {OPTIONS.map(({ id, label, icon: Icon, description }) => {
          const isActive = theme === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={isActive}
              onClick={() => {
                if (!isActive) toggleTheme();
              }}
              className={`relative flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'border-[#3CC8F5] bg-[#3CC8F5]/10 text-white shadow-lg shadow-[#3CC8F5]/5 scale-[1.01]'
                  : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                  isActive ? 'bg-[#3CC8F5] text-black font-bold' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                {isActive && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3CC8F5] text-black">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                )}
              </div>

              <div>
                <p className={`text-xs font-bold ${isActive ? 'text-[#3CC8F5]' : 'text-white'}`}>{label}</p>
                <p className="mt-0.5 text-[11px] text-zinc-500 leading-relaxed">{description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}