import { Volume2, FastForward, Rewind, Play, Command, Sparkles } from 'lucide-react';

const SHORTCUTS = [
  { keys: 'Espacio', action: 'Reproducir o pausar', icon: Play },
  { keys: '← / →', action: 'Retroceder o avanzar 5 segundos', icon: Rewind },
  { keys: '↑ / ↓', action: 'Subir o bajar volumen', icon: Volume2 },
  { keys: 'Shift + >', action: 'Aumentar velocidad de reproducción', icon: FastForward },
];

export default function PlaybackSettings() {
  return (
    <div className="space-y-6">
      {/* Sección de Atajos de Teclado */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Command className="h-4 w-4 text-[#3CC8F5]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Atajos de teclado rápidos</h3>
        </div>

        <ul className="divide-y divide-zinc-800 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-inner">
          {SHORTCUTS.map(({ keys, action, icon: Icon }) => (
            <li key={keys} className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-zinc-800/40">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-medium text-zinc-300">{action}</span>
              </div>
              <kbd className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 font-mono text-[11px] font-bold text-[#3CC8F5] shadow-sm">
                {keys}
              </kbd>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-zinc-500">Nota: Los atajos de teclado se desactivan automáticamente mientras escribes en un campo de texto.</p>
      </div>

      {/* Sección adicional de consejos de reproducción */}
      <div className="rounded-2xl border border-[#3CC8F5]/20 bg-[#3CC8F5]/[0.03] p-4 flex gap-3 items-start">
        <Sparkles className="h-5 w-5 text-[#3CC8F5] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-bold text-white">Optimización de audio</p>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Recuerda que puedes ajustar la velocidad de reproducción y la normalización de voz directamente desde el menú inferior del reproductor a pantalla completa.
          </p>
        </div>
      </div>
    </div>
  );
}