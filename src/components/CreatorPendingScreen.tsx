import { Clock, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface CreatorPendingScreenProps {
  onClose: () => void;
}

export default function CreatorPendingScreen({ onClose }: CreatorPendingScreenProps) {
  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-6 text-white text-center animate-in fade-in duration-200">
      <div className="max-w-md w-full rounded-3xl border border-zinc-800 bg-[#121214] p-8 shadow-2xl space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
          <Clock className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-400 border border-amber-500/20">
            ¡Gracias por ser parte de esta Misión!
          </span>
          <h1 className="text-xl font-bold sm:text-2xl">Solicitud Recibida con Éxito</h1>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Hemos recibido tu solicitud. Pronto recibirás una notificación con acceso a tu nuevo perfil de Autor-Sanctify / Sanctify-Creator.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-left space-y-3">
          <div className="flex items-center gap-3 text-xs text-zinc-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Firma de términos completada</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-300">
            <Clock className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Estamos preparando algo muy especial para ti</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al Inicio
        </button>
      </div>
    </div>
  );
}