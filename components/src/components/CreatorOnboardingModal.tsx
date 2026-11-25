import { useState } from 'react';
import { ShieldCheck, FileText, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/supabase';

interface CreatorOnboardingModalProps {
  session: any;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function CreatorOnboardingModal({
  session,
  onClose,
  onSubmitted,
}: CreatorOnboardingModalProps) {
  const [fullName, setFullName] = useState(session?.user?.user_metadata?.full_name || '');
  const [ministryName, setMinistryName] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedCode, setAgreedCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedTerms || !agreedCode) {
      setError('Debes aceptar los términos y el código de conducta para continuar.');
      return;
    }
    if (!fullName.trim() || !ministryName.trim()) {
      setError('Por favor completa tu nombre y el nombre de tu ministerio/canal.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const userId = session?.user?.id;

      // Guardamos o actualizamos el estado del creador en Supabase con estado 'pending'
      const { error: dbError } = await supabase.from('creator_profiles').upsert({
        id: userId,
        full_name: fullName,
        ministry_name: ministryName,
        status: 'pending', // Estado de revisión y preaprobación
        agreed_terms_at: new Date().toISOString(),
      });

      if (dbError) throw dbError;

      onSubmitted();
    } catch (err: any) {
      console.error('Error al registrar solicitud de creador:', err);
      setError('Ocurrió un error al enviar tus datos. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-[#121214] p-6 sm:p-8 shadow-2xl text-white">
        <div className="mb-6 flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3CC8F5]/10 text-[#3CC8F5] border border-[#3CC8F5]/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg">Hazte creador de contenido en Sanctify</h2>
              <p className="text-xs text-zinc-400">Llena tus datos para continuar </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Nombre Completo
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej. Juan Pérez"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#3CC8F5] transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Nombre de tu Canal / Ministerio / Parroquia
            </label>
            <input
              type="text"
              value={ministryName}
              onChange={(e) => setMinistryName(e.target.value)}
              placeholder="Ej. Coro Nuestra Señora de Guadalupe"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#3CC8F5] transition-colors"
              required
            />
          </div>

          <div className="max-h-36 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-[11px] text-zinc-400 space-y-2">
            <p className="font-semibold text-zinc-300 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-[#3CC8F5]" /> Términos y Condiciones de Publicación
            </p>
            <p>
              1. Todo el contenido compartido debe estar alineado con los valores y la doctrina católica.
            </p>
            <p>
              2. Te comprometes a no subir material protegido por derechos de autor sin la debida autorización.
            </p>
            <p>
              3. Las solicitudes pasan por un breve periodo de revisión y preaprobación comunitaria antes de habilitar el panel de Creator Studio completo.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-[#3CC8F5] focus:ring-0"
              />
              <span>Acepto los términos y condiciones de publicación en Sanctify.</span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={agreedCode}
                onChange={(e) => setAgreedCode(e.target.checked)}
                className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-[#3CC8F5] focus:ring-0"
              />
              <span>Me comprometo a seguir el código de conducta y doctrina católica.</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#3CC8F5] py-3 text-sm font-bold text-black transition-transform hover:scale-[1.01] disabled:opacity-50"
          >
            {loading ? 'Enviando solicitud...' : 'Firmar y Enviar a Revisión'}
          </button>
        </form>
      </div>
    </div>
  );
}