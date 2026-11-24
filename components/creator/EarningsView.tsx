import { useState, useEffect, useCallback } from 'react';
import {
  ArrowRight,
  Check,
  DollarSign,
  Gift,
  Heart,
  Mail,
  Send,
  TrendingUp,
  Users,
  X,
  Sparkles,
  Download,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/supabase';

const ACC = '#E0B95B'; // Acento dorado Sanctify

interface Sponsor {
  id: string;
  name: string;
  amount: string;
  rawAmount: number;
  date: string;
  message?: string;
  thanked: boolean;
}

interface EarningsTransaction {
  id: string;
  title: string;
  date: string;
  amount: string;
  rawAmount: number;
}

interface EarningsViewProps {
  session?: any;
  onOpenPayItForward?: () => void;
}

function ThankYouModal({
  sponsor,
  session,
  onClose,
  onSuccess,
}: {
  sponsor: Sponsor;
  session?: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [message, setMessage] = useState(
    `Querido ${sponsor.name},\n\nGracias por tu generosidad. Tu apoyo hace posible que este contenido llegue a más personas. ¡Que Dios te bendiga!\n\nCon cariño,\nTu equipo de Sanctify`
  );
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!sponsor.id || !session?.user?.id) {
      setSent(true);
      window.setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
      return;
    }

    try {
      setLoading(true);

      // 1. Persistir la notificación de agradecimiento en Supabase
      const { error } = await supabase.from('creator_notifications').insert({
        creator_id: session.user.id,
        sponsor_id: sponsor.id,
        title: '¡El creador te ha enviado un mensaje de agradecimiento!',
        message: message,
      });

      if (error) console.error('Error al guardar la notificación:', error);

      setSent(true);
      window.setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Error enviando agradecimiento:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#121214] p-6 shadow-2xl text-white">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4" style={{ color: ACC }} />
            <h3 className="font-bold text-white text-base">Agradecer a {sponsor.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-3 text-xs text-zinc-400">
          Personaliza tu mensaje de agradecimiento. Se enviará a las notificaciones del benefactor.
        </p>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900/90 px-4 py-3 text-sm text-white outline-none focus:border-[#E0B95B] transition-colors"
        />

        <button
          onClick={handleSend}
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-black transition-transform hover:scale-[1.01] disabled:opacity-50"
          style={{ background: sent ? '#10b981' : ACC }}
        >
          {sent ? (
            <>
              <Check className="h-4 w-4" /> ¡Mensaje enviado con éxito!
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> {loading ? 'Enviando...' : 'Enviar agradecimiento'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function WithdrawModal({ currentBalance, onClose }: { currentBalance: number; onClose: () => void }) {
  const [option, setOption] = useState<'withdraw' | 'donate'>('withdraw');
  const [amount, setAmount] = useState('');
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  const handleConfirm = () => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg('Ingresa un monto válido.');
      return;
    }
    if (numericAmount > currentBalance) {
      setErrorMsg('El monto supera tu saldo disponible.');
      return;
    }

    setErrorMsg('');
    setDone(true);
    window.setTimeout(onClose, 1600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-[#121214] p-6 shadow-2xl text-white">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-white text-base">Gestionar fondos</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setOption('withdraw');
              setErrorMsg('');
            }}
            className="flex flex-col items-center gap-2 rounded-xl border-2 p-3.5 text-xs font-bold transition-all"
            style={
              option === 'withdraw'
                ? { borderColor: ACC, backgroundColor: `${ACC}15`, color: ACC }
                : { borderColor: '#27272a', color: '#a1a1aa' }
            }
          >
            <Download className="h-5 w-5" />
            Retirar fondos
          </button>
          <button
            type="button"
            onClick={() => {
              setOption('donate');
              setErrorMsg('');
            }}
            className="flex flex-col items-center gap-2 rounded-xl border-2 p-3.5 text-xs font-bold transition-all"
            style={
              option === 'donate'
                ? { borderColor: ACC, backgroundColor: `${ACC}15`, color: ACC }
                : { borderColor: '#27272a', color: '#a1a1aa' }
            }
          >
            <Gift className="h-5 w-5" />
            Reinvertir en Sanctify
          </button>
        </div>

        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Monto (MXN)
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setErrorMsg('');
            }}
            placeholder="0.00"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#E0B95B] transition-colors"
          />
          <button
            type="button"
            onClick={() => setAmount(currentBalance.toString())}
            className="absolute right-2 top-2 rounded-lg bg-zinc-800 px-2 py-1 text-[10px] font-bold text-zinc-300 hover:text-white"
          >
            MÁX
          </button>
        </div>

        {errorMsg && <p className="mt-1.5 text-xs text-rose-400 font-medium">{errorMsg}</p>}
        <p className="mt-2 text-[11px] text-zinc-500">
          Saldo disponible: {formatCurrency(currentBalance)}
        </p>

        <button
          onClick={handleConfirm}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-black transition-transform hover:scale-[1.01]"
          style={{ background: done ? '#10b981' : ACC }}
        >
          {done ? (
            <>
              <Check className="h-4 w-4" /> ¡Solicitud procesada!
            </>
          ) : (
            <>
              <ArrowRight className="h-4 w-4" />{' '}
              {option === 'withdraw' ? 'Solicitar retiro' : 'Donar a la plataforma'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function EarningsView({ session, onOpenPayItForward }: EarningsViewProps) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [transactions, setTransactions] = useState<EarningsTransaction[]>([]);
  const [thankTarget, setThankTarget] = useState<Sponsor | null>(null);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [monthlyEarnings, setMonthlyEarnings] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  const fetchFinancialData = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const creatorId = session.user.id;

      // 1. Obtener donaciones e ingresos de creator_earnings
      const { data: earningsData, error: earningsErr } = await supabase
        .from('creator_earnings')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

      if (earningsErr) console.error('Error fetching earnings:', earningsErr);

      let total = 0;
      let monthly = 0;
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const txList: EarningsTransaction[] = [];

      if (earningsData && earningsData.length > 0) {
        earningsData.forEach((row) => {
          const amt = Number(row.amount) || 0;
          total += amt;

          const rowDate = new Date(row.created_at);
          if (rowDate.getMonth() === currentMonth && rowDate.getFullYear() === currentYear) {
            monthly += amt;
          }

          txList.push({
            id: row.id,
            title: row.source === 'pay_it_forward' ? 'Fondo Pay It Forward' : 'Donación Directa',
            date: rowDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }),
            amount: `+${formatCurrency(amt)}`,
            rawAmount: amt,
          });
        });
      }

      // 2. Obtener lista de Padrinos Benefactores de benefactor_sponsors
      const { data: benefactorsData, error: benefactorsErr } = await supabase
        .from('benefactor_sponsors')
        .select('*')
        .eq('creator_id', creatorId)
        .order('joined_date', { ascending: false });

      if (benefactorsErr) console.error('Error fetching benefactors:', benefactorsErr);

      const sponsorsList: Sponsor[] = (benefactorsData || []).map((b) => {
        const bDate = new Date(b.joined_date);
        return {
          id: b.id,
          name: b.sponsor_name || 'Benefactor Anónimo',
          amount: formatCurrency(Number(b.monthly_amount) || 0),
          rawAmount: Number(b.monthly_amount) || 0,
          date: bDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }),
          message: `Nivel ${b.tier}`,
          thanked: false,
        };
      });

      setTotalEarnings(total);
      setMonthlyEarnings(monthly);
      setTransactions(txList);
      setSponsors(sponsorsList);
    } catch (err) {
      console.error('Error general cargando datos de ingresos:', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchFinancialData();
  }, [fetchFinancialData]);

  const markThanked = (id: string) => {
    setSponsors((current) => current.map((s) => (s.id === id ? { ...s, thanked: true } : s)));
    setThankTarget(null);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Tarjeta de Saldo Principal */}
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-[#121214] to-[#0e1015] p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Saldo disponible</p>
          {loading && <RefreshCw className="h-4 w-4 animate-spin text-[#E0B95B]" />}
        </div>
        <p className="mt-3 text-4xl font-extrabold text-white">
          {formatCurrency(totalEarnings)}{' '}
          <span className="text-base font-normal text-zinc-500">MXN</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => setShowWithdraw(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-black transition-transform hover:scale-[1.02]"
            style={{ background: ACC }}
          >
            <DollarSign className="h-4 w-4" /> Gestionar fondos
          </button>

          {onOpenPayItForward && (
            <button
              onClick={onOpenPayItForward}
              className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:border-zinc-500 hover:text-white transition-all"
            >
              <Heart className="h-4 w-4 text-rose-400" /> Ver Pay It Forward
            </button>
          )}
        </div>
      </div>

      {/* Tarjetas de Resumen Financiero */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: 'Este mes',
            value: formatCurrency(monthlyEarnings),
            delta: 'Aportaciones activas',
            icon: TrendingUp,
          },
          {
            label: 'Donaciones directas',
            value: formatCurrency(totalEarnings),
            delta: 'Pay It Forward',
            icon: Heart,
          },
          {
            label: 'Total acumulado',
            value: formatCurrency(totalEarnings),
            delta: 'Histórico real',
            icon: DollarSign,
          },
          {
            label: 'Benefactores',
            value: sponsors.length.toString(),
            delta: 'Comunidad activa',
            icon: Users,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-zinc-800 bg-[#121214] p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500">{item.label}</p>
                <Icon className="h-4 w-4" style={{ color: ACC }} />
              </div>
              <p className="mt-2 text-xl font-bold text-white">{item.value}</p>
              <p className="mt-1 text-[11px] font-semibold text-emerald-400">{item.delta}</p>
            </div>
          );
        })}
      </div>

      {/* Lista de Benefactores y Patrocinadores */}
      <div className="rounded-2xl border border-zinc-800 bg-[#121214] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base">Patrocinadores y Benefactores</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Personas que han impulsado tu contenido</p>
          </div>
          <span className="text-xs font-semibold text-zinc-400 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
            {sponsors.length} donante(s)
          </span>
        </div>

        {sponsors.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            Aún no tienes Padrinos Benefactores registrados. Las aportaciones recurrentes aparecerán aquí.
          </div>
        ) : (
          <div className="space-y-3">
            {sponsors.map((sponsor) => (
              <div
                key={sponsor.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3.5 transition-all hover:border-zinc-700"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                    style={{ background: `${ACC}15`, color: ACC }}
                  >
                    <Heart className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{sponsor.name}</p>
                    <p className="text-xs text-zinc-500">
                      {sponsor.date}
                      {sponsor.message ? ` · "${sponsor.message}"` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/60">
                  <span className="font-bold text-emerald-400 text-sm">{sponsor.amount}</span>
                  {sponsor.thanked ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                      <Check className="h-3 w-3" /> Agradecido
                    </span>
                  ) : (
                    <button
                      onClick={() => setThankTarget(sponsor)}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-[11px] font-bold text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
                    >
                      <Mail className="h-3 w-3" style={{ color: ACC }} /> Agradecer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial de Transacciones */}
      <div className="rounded-2xl border border-zinc-800 bg-[#121214] p-5">
        <h3 className="mb-4 font-bold text-white text-base">Últimas transacciones</h3>
        {transactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            Aún no hay transacciones registradas.
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{tx.title}</p>
                  <p className="text-xs text-zinc-500">{tx.date}</p>
                </div>
                <span className="font-bold text-emerald-400 text-sm">{tx.amount}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {thankTarget && (
        <ThankYouModal
          sponsor={thankTarget}
          session={session}
          onClose={() => setThankTarget(null)}
          onSuccess={() => markThanked(thankTarget.id)}
        />
      )}

      {showWithdraw && (
        <WithdrawModal
          currentBalance={totalEarnings}
          onClose={() => setShowWithdraw(false)}
        />
      )}
    </div>
  );
}