import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Users,
  X,
  ShieldCheck,
  RefreshCw,
  HeartHandshake,
  Sparkles,
  Award,
  Mail,
  Send,
} from 'lucide-react';
import DonationWidget from '@/components/DonationWidget';
import { supabase } from '@/supabase';

type MilestoneStatus = 'completed' | 'current' | 'next' | 'upcoming';

interface Milestone {
  id: string;
  title: string;
  raised: number;
  goal: number;
  donors: number;
  status: MilestoneStatus;
  badge: string;
  description: string;
  investments: string[];
}

interface SponsorItem {
  id: string;
  name: string;
  role: string;
  message: string;
  unlockedMilestone: string;
  amount: string;
  date: string;
  thanked: boolean;
}

const ACC = '#E0B95B'; // Dorado Sanctify

const statusConfig: Record<MilestoneStatus, { label: string; color: string; dotColor: string; barAccent: string }> = {
  completed: { label: 'Completado', color: 'text-emerald-400', dotColor: 'bg-emerald-500', barAccent: 'from-emerald-500 to-teal-600' },
  current: { label: 'En Fondeo Actual', color: 'text-[#E0B95B]', dotColor: 'bg-[#E0B95B]', barAccent: 'from-[#E0B95B] to-amber-600' },
  next: { label: 'Próximo Hito', color: 'text-amber-300', dotColor: 'bg-amber-500', barAccent: 'from-amber-500 to-amber-700' },
  upcoming: { label: 'Fase Inicial', color: 'text-zinc-500', dotColor: 'bg-zinc-600', barAccent: 'from-zinc-600 to-zinc-700' },
};

function formatMXN(amount: number): string {
  return `$${amount.toLocaleString('es-MX')} MXN`;
}

function percentage(raised: number, goal: number): number {
  return Math.min(100, goal > 0 ? (raised / goal) * 100 : 0);
}

// Componente ProgressBar optimizado con ancho mínimo visual
function ProgressBar({ value, accent }: { value: number; accent: string }) {
  // Si hay cualquier progreso > 0, aseguramos un mínimo de 1.5% para que la barra dorada siempre sea visible
  const visualWidth = value > 0 ? Math.max(value, 1.5) : 0;

  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${accent} transition-[width] duration-700 ease-out`}
        style={{ width: `${visualWidth}%` }}
      />
    </div>
  );
}

// Modal de Agradecimiento Flotante
function ThankYouModal({
  sponsor,
  session,
  onClose,
  onSuccess,
}: {
  sponsor: SponsorItem;
  session?: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [message, setMessage] = useState(
    `Querid@ ${sponsor.name},\n\nGracias por tu generosa aportación de ${sponsor.amount}. Tu apoyo hace posible que este contenido llegue a más personas. ¡Que Dios te bendiga!\n\nCon cariño,\nTu equipo de Sanctify`
  );
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    try {
      setLoading(true);

      if (session?.user?.id && sponsor.id) {
        await supabase.from('creator_notifications').insert({
          recipient_id: sponsor.id,
          creator_id: session.user.id,
          title: '¡Mensaje de agradecimiento de Sanctify!',
          message: message,
          type: 'donation_thanked',
          read: false,
        });
      }

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
            <HeartHandshake className="h-4 w-4" style={{ color: ACC }} />
            <h3 className="font-bold text-white text-base">Agradecer a {sponsor.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
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
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-black transition-transform hover:scale-[1.01] disabled:opacity-50 cursor-pointer"
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

interface PayItForwardScreenProps {
  onClose: () => void;
  session?: any;
  creatorId?: string;
  onDonationSuccess?: () => void;
}

export default function PayItForwardScreen({
  onClose,
  session,
  creatorId,
  onDonationSuccess,
}: PayItForwardScreenProps) {
  const [expandedId, setExpandedId] = useState<string | null>('hito-1');
  const [monthlyRaised, setMonthlyRaised] = useState<number>(0);
  const [monthlyGoal] = useState<number>(800000);
  const [donorsCount, setDonorsCount] = useState<number>(0);
  const [creatorsCount, setCreatorsCount] = useState<number>(0);
  
  const [userImpactAmount, setUserImpactAmount] = useState<number>(0);
  const [userImpactListeners, setUserImpactListeners] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [thankTarget, setThankTarget] = useState<SponsorItem | null>(null);

  const [milestones, setMilestones] = useState<Milestone[]>([
    {
      id: 'hito-1',
      title: 'Hito 1: Audio & Lecturas Base',
      raised: 0,
      goal: 800000,
      donors: 0,
      status: 'current',
      badge: 'Fase Inicial',
      description: 'La app inicial: reproductor de audio, catálogo de música, podcasts y lecturas espirituales.',
      investments: [
        'Servidores de streaming de audio',
        'Catálogo inicial de 500+ pistas',
        'Reproductor web y móvil',
        'Licencias de música litúrgica',
      ],
    },
    {
      id: 'hito-2',
      title: 'Hito 2: Creator Studio & Suite de Edición',
      raised: 0,
      goal: 600000,
      donors: 0,
      status: 'next',
      badge: 'Próximo Hito',
      description: 'Herramientas para que creadores y sacerdotes produzcan, editen y publiquen contenido sin barreras técnicas.',
      investments: [
        'Herramientas de recortes y edición para creadores',
        'Licencias de música y efectos de sonido',
        'Panel de analíticas para creadores',
        'Moderación y revisión de contenido',
      ],
    },
    {
      id: 'hito-3',
      title: 'Hito 3: Círculos de Fe & Comunidad',
      raised: 0,
      goal: 600000,
      donors: 0,
      status: 'upcoming',
      badge: 'Próximo Hito',
      description: 'Espacios comunitarios donde parroquias y grupos de oración se reúnen, comparten y crecen juntos.',
      investments: [
        'Infraestructura para Círculos de Oración virtuales',
        'Sistemas de chat y notificaciones comunitarias',
        'Herramientas de moderación parroquial',
        'Integración con calendario litúrgico',
      ],
    },
    {
      id: 'hito-4',
      title: 'Hito 4: Shorts de Fe & Videos',
      raised: 0,
      goal: 1000000,
      donors: 0,
      status: 'upcoming',
      badge: 'Fase de Escalado',
      description: 'Videos cortos verticales y app nativa para Smart TV, llevando el Evangelio a cada pantalla del hogar.',
      investments: [
        'Servidores de streaming de video de baja latencia',
        'App nativa para Smart TV (Samsung, LG, Roku)',
        'Infraestructura de codificación de Shorts',
        'CDN para cobertura en toda Latinoamérica',
      ],
    },
  ]);

  const [sponsorsList, setSponsorsList] = useState<SponsorItem[]>([]);

  // Sincronizar datos reales desde la tabla 'donations' y 'creator_profiles'
  const fetchRealtimeDonations = async () => {
    try {
      setLoadingStats(true);
      
      // Consultar la tabla de donaciones real
      const { data: donationsData, error: donationsErr } = await supabase
        .from('donations')
        .select('id, amount, user_id, message, created_at, thanked');

      if (donationsErr) throw donationsErr;

      if (donationsData) {
        // 1. Calcular total recaudado sumando 'amount'
        const totalRaised = donationsData.reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
        setMonthlyRaised(totalRaised);

        // 2. Contar donantes únicos basados en user_id (o total de donaciones si no hay ID de usuario)
        const uniqueDonors = new Set(donationsData.map((d) => d.user_id).filter(Boolean));
        const totalDonorsCount = uniqueDonors.size > 0 ? uniqueDonors.size : donationsData.length;
        setDonorsCount(totalDonorsCount);

        // 3. Si el usuario actual tiene sesión, calcular su impacto personal
        if (session?.user?.id) {
          const myDonations = donationsData.filter((d) => d.user_id === session.user.id);
          const myTotal = myDonations.reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
          setUserImpactAmount(myTotal);
          setUserImpactListeners(Math.floor(myTotal / 10)); // Métrica estimada de alcance
        } else {
          setUserImpactAmount(0);
          setUserImpactListeners(0);
        }

        // 4. Distribuir el monto recaudado dinámicamente en el Hito 1
        setMilestones((prev) =>
          prev.map((milestone, index) => {
            if (index === 0) {
              return {
                ...milestone,
                raised: totalRaised,
                donors: totalDonorsCount,
              };
            }
            return milestone;
          })
        );

        // 5. Poblar el Muro de Benefactores con donativos reales recientes
        const realSponsors: SponsorItem[] = donationsData.map((d, i) => ({
          id: d.user_id || d.id || `sponsor-${i}`,
          name: d.message ? `Benefactor Solidario` : `Guardián Anónimo`,
          role: 'Guardián de la Comunidad',
          message: d.message || 'Aportación voluntaria para sostener la plataforma.',
          unlockedMilestone: 'Hito 1',
          amount: formatMXN(Number(d.amount) || 0),
          date: new Date(d.created_at).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }),
          thanked: d.thanked || false,
        }));

        // Mantener a Aurora Soriano como registro de honor comunitario
        setSponsorsList([
          {
            id: 'aurora-soriano',
            name: 'Aurora Soriano',
            role: 'Guardián de la Comunidad',
            message: 'Dono para que más jóvenes tengan música católica de calidad.',
            unlockedMilestone: 'Hito 1',
            amount: '$100 MXN',
            date: 'Oct 2026',
            thanked: false,
          },
          ...realSponsors,
        ]);
      }

      // 6. Contar creadores activos aprobados
      const { count, error: countErr } = await supabase
        .from('creator_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      if (!countErr && count !== null) {
        setCreatorsCount(count);
      }
    } catch (err) {
      console.error('Error sincronizando datos de Pay It Forward:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchRealtimeDonations();
  }, [session]);

  const markThanked = (id: string) => {
    setSponsorsList((current) => current.map((s) => (s.id === id ? { ...s, thanked: true } : s)));
    setThankTarget(null);
  };

  const handleSuccessfulDonation = () => {
    fetchRealtimeDonations();
    if (onDonationSuccess) onDonationSuccess();
  };

  const monthlyPct = percentage(monthlyRaised, monthlyGoal);

  return (
    <div className="min-h-screen bg-[#0A0A0B] pb-28 text-white animate-in fade-in duration-300">
      {/* Cabecera Superior */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-[#0A0A0B]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-sm font-semibold text-zinc-300 transition-colors hover:text-[#E0B95B] cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Volver</span>
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="font-bold text-[#E0B95B]">Pay It Forward</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-800 cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        {/* Banner Principal */}
        <div className="rounded-3xl border border-[#E0B95B]/30 bg-gradient-to-br from-[#121214] to-[#0A0A0B] p-6 shadow-2xl sm:p-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#E0B95B]/30 bg-[#E0B95B]/10 px-3 py-1 text-xs font-bold text-[#E0B95B]">
            <ShieldCheck className="h-3.5 w-3.5" /> Modelo 100% Opcional & Comunitario
          </div>
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
            Haz posible que Sanctify llegue a más personas y <span style={{ color: ACC }}>siga mejorando para todos!</span>
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400 sm:text-base">
            Gracias a la comunidad, Sanctify es 100% gratuito y sin anuncios. Elige el módulo que deseas apoyar hoy directamente en pesos mexicanos.
          </p>
        </div>

        {/* Sección: Mi Impacto Personal */}
        <section className="rounded-2xl border border-zinc-800/80 bg-gradient-to-r from-zinc-900/60 to-[#121214] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HeartHandshake className="h-4 w-4 text-[#E0B95B]" />
              <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-400">Mi Impacto Personal</h2>
            </div>
            <span className="text-xs font-extrabold text-[#E0B95B]">{formatMXN(userImpactAmount)} aportados</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="text-[10px] uppercase font-semibold text-zinc-500">Oyentes Beneficiados</p>
              <p className="text-lg font-extrabold text-white mt-1">{userImpactListeners.toLocaleString('es-MX')}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="text-[10px] uppercase font-semibold text-zinc-500">Nivel de Impacto</p>
              <p className="text-lg font-extrabold text-[#E0B95B] mt-1">
                {userImpactAmount > 0 ? 'Sembrador Activo' : 'Sin Aportes'}
              </p>
            </div>
          </div>
        </section>

        {/* Meta General */}
        <section className="rounded-2xl border border-zinc-800 bg-[#121214] p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-400">Meta General del Hito Inicial</h2>
              {loadingStats && <RefreshCw className="h-3 w-3 animate-spin text-[#E0B95B]" />}
            </div>
            <span className="text-2xl font-bold text-[#E0B95B]">
              {monthlyPct > 0 && monthlyPct < 1 ? monthlyPct.toFixed(2) : monthlyPct.toFixed(0)}%
            </span>
          </div>
          <div className="mb-2 flex items-end justify-between">
            <p className="text-3xl font-bold text-white">{formatMXN(monthlyRaised)}</p>
            <p className="text-sm text-zinc-500">de {formatMXN(monthlyGoal)}</p>
          </div>
          <ProgressBar value={monthlyPct} accent="from-[#E0B95B] to-amber-600" />
          
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
              <div className="flex items-center gap-2 text-zinc-400">
                <Users className="h-4 w-4 text-[#E0B95B]" />
                <span className="text-xs">Oyentes sostenidos</span>
              </div>
              <p className="mt-1 text-xl font-bold">{donorsCount.toLocaleString('es-MX')}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
              <div className="flex items-center gap-2 text-zinc-400">
                <Check className="h-4 w-4 text-[#E0B95B]" />
                <span className="text-xs">Creadores activos</span>
              </div>
              <p className="mt-1 text-xl font-bold">{creatorsCount}</p>
            </div>
          </div>
        </section>

        {/* Línea de Tiempo de Hitos */}
        <section>
          <h2 className="mb-4 text-lg font-bold text-white">Línea de Tiempo de Hitos</h2>
          <div className="relative">
            <div className="absolute bottom-0 left-4 top-0 w-0.5 bg-zinc-800" />
            {milestones.map((milestone, index) => {
              const pct = percentage(milestone.raised, milestone.goal);
              const config = statusConfig[milestone.status];
              const isExpanded = expandedId === milestone.id;
              const isLast = index === milestones.length - 1;
              return (
                <div key={milestone.id} className={`relative ${isLast ? '' : 'pb-2'}`}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : milestone.id)}
                    className="flex w-full items-start gap-4 rounded-2xl p-3 text-left transition-colors hover:bg-zinc-900/50 cursor-pointer"
                    aria-expanded={isExpanded}
                  >
                    <span
                      className={`relative z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.dotColor} ring-4 ring-[#0A0A0B]`}
                    >
                      {milestone.status === 'completed' ? (
                        <Check className="h-4 w-4 text-black" />
                      ) : (
                        <span className="text-xs font-bold text-black">{index + 1}</span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white sm:text-base">{milestone.title}</p>
                        <ChevronDown
                          className={`h-5 w-5 shrink-0 text-zinc-500 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full bg-zinc-900 px-2.5 py-0.5 text-[11px] font-bold ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {formatMXN(milestone.raised)} / {formatMXN(milestone.goal)}
                        </span>
                      </div>
                      <div className="mt-2.5">
                        <ProgressBar value={pct} accent={config.barAccent} />
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mb-3 ml-12 rounded-2xl border border-zinc-800 bg-[#121214] p-4 animate-in fade-in duration-200">
                      <p className="text-sm leading-6 text-zinc-300">{milestone.description}</p>
                      <div className="mt-4">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">¿En qué se invierte?</p>
                        <ul className="space-y-2">
                          {milestone.investments.map((item) => (
                            <li key={item} className="flex items-start gap-2 text-sm text-zinc-400">
                              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E0B95B]" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
                        <Users className="h-3.5 w-3.5" />
                        {milestone.donors.toLocaleString('es-MX')} donantes · {pct > 0 && pct < 1 ? pct.toFixed(2) : pct.toFixed(0)}% completado
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Widget de Donación */}
        <DonationWidget />

        {/* Muro de Benefactores */}
        <section className="rounded-3xl border border-zinc-800 bg-[#121214] p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E0B95B]/10 px-3 py-1 text-xs font-bold text-[#E0B95B] border border-[#E0B95B]/20 mb-2">
                <Sparkles className="h-3.5 w-3.5" /> Muro de Honor
              </div>
              <h2 className="text-xl font-bold text-white sm:text-2xl">Padrinos y Benefactores</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Almas generosas que hacen posible que Sanctify permanezca libre de anuncios y accesible para todos.
              </p>
            </div>
            <span className="text-xs font-semibold text-zinc-400 bg-zinc-900 px-3.5 py-1.5 rounded-xl border border-zinc-800 self-start sm:self-auto">
              {sponsorsList.length} Guardián(es) Activo(s)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {sponsorsList.map((sponsor, index) => (
              <div
                key={sponsor.id || index}
                className={`relative rounded-2xl border p-5 transition-all duration-300 ${
                  index === 0
                    ? 'border-[#E0B95B]/40 bg-gradient-to-br from-zinc-900/90 to-[#121214] shadow-lg shadow-[#E0B95B]/5'
                    : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-inner"
                      style={{ background: `${ACC}20`, color: ACC }}
                    >
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-white sm:text-base">{sponsor.name}</h3>
                        <span className="rounded-full bg-[#E0B95B]/10 px-2.5 py-0.5 text-[10px] font-extrabold text-[#E0B95B] border border-[#E0B95B]/20">
                          {sponsor.role}
                        </span>
                      </div>
                      <p className="text-xs italic text-zinc-300 leading-relaxed pt-0.5">
                        "{sponsor.message}"
                      </p>
                      <div className="flex items-center gap-2 pt-1 text-[11px] text-zinc-500 font-medium">
                        <Award className="h-3.5 w-3.5 text-[#E0B95B]" />
                        <span>
                          Ayudó a desbloquear: <strong className="text-zinc-300">{sponsor.unlockedMilestone}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-zinc-800 pt-3 sm:pt-0 gap-2">
                    <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      {sponsor.amount}
                    </span>

                    {sponsor.thanked ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                        <Check className="h-3 w-3" /> Agradecido
                      </span>
                    ) : (
                      <button
                        onClick={() => setThankTarget(sponsor)}
                        className="flex items-center gap-1.5 rounded-lg border border-[#E0B95B]/40 bg-[#E0B95B]/10 px-3 py-1 text-[11px] font-bold text-[#E0B95B] hover:bg-[#E0B95B] hover:text-black transition-all cursor-pointer"
                      >
                        <Mail className="h-3 w-3" /> Agradecer
                      </button>
                    )}

                    <span className="text-[10px] text-zinc-500 sm:mt-1">{sponsor.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {thankTarget && (
        <ThankYouModal
          sponsor={thankTarget}
          session={session}
          onClose={() => setThankTarget(null)}
          onSuccess={() => markThanked(thankTarget.id)}
        />
      )}
    </div>
  );
}