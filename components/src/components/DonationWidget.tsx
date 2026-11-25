import { useState } from 'react';
import { HeartHandshake, CreditCard, Lock } from 'lucide-react';
import { supabase } from '../supabase'; // Ajusta la ruta a tu cliente de Supabase si es necesario

const ACC = '#E0B95B'; // Dorado Sanctify
const amounts = [50, 100, 250, 500, 1000]; // Montos sugeridos en MXN

export default function DonationWidget() {
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isFrequencyMonthly, setIsFrequencyMonthly] = useState(false);

  const finalAmount = customAmount ? parseFloat(customAmount) : selectedAmount;

  const handlePayItForward = async () => {
    if (!finalAmount || finalAmount <= 0) {
      alert('Por favor selecciona un monto válido.');
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email || 'anonimo@sanctify.app';

      // Invocación de la Edge Function en Supabase
      const { data, error } = await supabase.functions.invoke('create-mercadopago-preference', {
        body: {
          amount: finalAmount,
          title: `Aporte ${isFrequencyMonthly ? 'Mensual' : 'Único'} Pay It Forward`,
          donorEmail: userEmail,
        },
      });

      if (error) throw error;

      if (data?.init_point) {
        // Redirección a la pasarela de Mercado Pago
        window.location.href = data.init_point;
      }
    } catch (err: any) {
      alert('Error al iniciar el pago con Mercado Pago: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-[#E0B95B]/30 bg-[#121214] p-6 shadow-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 fill-[#E0B95B] text-[#E0B95B]" /> Unirse al Círculo de Benefactores
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">Elige tu aporte opcional para mantener Sanctify 100% gratuito.</p>
        </div>
      </div>

      {/* Selector de Frecuencia */}
      <div className="flex rounded-xl bg-zinc-900 p-1 border border-zinc-800">
        <button
          type="button"
          onClick={() => setIsFrequencyMonthly(false)}
          className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
            !isFrequencyMonthly ? 'bg-[#E0B95B] text-black' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Aporte Único
        </button>
        <button
          type="button"
          onClick={() => setIsFrequencyMonthly(true)}
          className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
            isFrequencyMonthly ? 'bg-[#E0B95B] text-black' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Aporte Mensual
        </button>
      </div>

      {/* Selector de Montos en MXN */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">
          Selecciona el monto (MXN)
        </label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {amounts.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => {
                setSelectedAmount(amt);
                setCustomAmount('');
              }}
              className={`rounded-xl border-2 py-3 text-sm font-bold transition-all ${
                selectedAmount === amt && !customAmount
                  ? 'border-[#E0B95B] bg-[#E0B95B]/15 text-[#E0B95B]'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-white'
              }`}
            >
              ${amt}
            </button>
          ))}
        </div>

        {/* Campo de Monto Personalizado */}
        <div className="mt-3">
          <input
            type="number"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="Otro monto personalizado en MXN..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-[#E0B95B] placeholder:text-zinc-600"
          />
        </div>
      </div>

      {/* Botón de Pago Directo */}
      <button
        type="button"
        onClick={handlePayItForward}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 text-sm font-bold text-black transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
        style={{ background: ACC }}
      >
        <CreditCard className="h-4 w-4" />
        {loading ? 'Generando pago seguro...' : `Aportar $${finalAmount || 0} MXN`}
      </button>

      <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500">
        <Lock className="h-3.5 w-3.5 text-emerald-400" />
        Pagos procesados de forma 100% segura mediante Mercado Pago
      </div>
    </div>
  );
}