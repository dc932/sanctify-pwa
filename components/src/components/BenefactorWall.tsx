import { Award, Download, Share2, TrendingUp, Users } from 'lucide-react';

interface Benefactor {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  milestone: string;
  message: string;
  isAnonymous: boolean;
}

const benefactors: Benefactor[] = [
  {
    id: 'b1',
    name: 'María González',
    badge: 'Guardián de la Comunidad',
    badgeColor: 'text-emerald-400',
    milestone: 'Hito 1',
    message: 'Dono para que más jóvenes tengan música católica de calidad.',
    isAnonymous: false,
  },
  {
    id: 'b2',
    name: 'Anónimo',
    badge: 'Impulsor de Creadores',
    badgeColor: 'text-[#3CC8F5]',
    milestone: 'Hito 2',
    message: 'Gracias por hacer la herramienta accesible para todos.',
    isAnonymous: true,
  },
  {
    id: 'b3',
    name: 'Familia Ramírez',
    badge: 'Impulsor de Creadores',
    badgeColor: 'text-[#3CC8F5]',
    milestone: 'Hito 2',
    message: 'Que el Evangelio llegue a cada rincón de Latinoamérica.',
    isAnonymous: false,
  },
  {
    id: 'b4',
    name: 'P. Juan Carlos',
    badge: 'Guardián de la Comunidad',
    badgeColor: 'text-emerald-400',
    milestone: 'Hito 1',
    message: 'Como sacerdote, veo cómo transforma vidas. ¡Adelante!',
    isAnonymous: false,
  },
];

const expenseDistribution = [
  { label: 'Servidores y Ancho de Banda', percentage: 60, color: 'bg-[#3CC8F5]' },
  { label: 'Fondo de Creadores y Licencias', percentage: 25, color: 'bg-sky-500' },
  { label: 'Moderación y Soporte Técnico', percentage: 15, color: 'bg-emerald-500' },
];

export default function BenefactorWall() {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-[#121214] p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-[#3CC8F5]" />
          <h2 className="text-lg font-bold text-white">Muro de Padrinos y Benefactores</h2>
        </div>
        <div className="space-y-3">
          {benefactors.map((benefactor) => (
            <div key={benefactor.id} className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-[#3CC8F5]">
                  {benefactor.isAnonymous ? '?' : benefactor.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-white">{benefactor.name}</p>
                    <span className={`flex items-center gap-1 text-[11px] font-bold ${benefactor.badgeColor}`}>
                      <Award className="h-3.5 w-3.5" />
                      {benefactor.badge}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-5 text-zinc-400">{benefactor.message}</p>
                  <p className="mt-2 text-[11px] text-zinc-600">Ayudó a desbloquear: {benefactor.milestone}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#3CC8F5]/20 bg-gradient-to-br from-[#121214] to-[#0A0A0B] p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-[#3CC8F5]" />
          <h2 className="text-lg font-bold text-white">Mi Impacto</h2>
        </div>
        <p className="mb-4 text-sm text-zinc-400">Panel privado con tu historial de contribuciones a la comunidad.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-zinc-900/80 p-4">
            <p className="text-xs text-zinc-500">Total aportado</p>
            <p className="mt-1 text-2xl font-bold text-[#3CC8F5]">$180</p>
          </div>
          <div className="rounded-xl bg-zinc-900/80 p-4">
            <p className="text-xs text-zinc-500">Personas beneficiadas</p>
            <p className="mt-1 text-2xl font-bold text-white">1,800</p>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#3CC8F5] px-4 py-3 text-sm font-bold text-black transition-transform hover:scale-[1.01]">
            <Download className="h-4 w-4" />
            Certificado
          </button>
          <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-300 transition-colors hover:border-[#3CC8F5] hover:text-[#3CC8F5]">
            <Share2 className="h-4 w-4" />
            Compartir
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-[#121214] p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[#3CC8F5]" />
          <h2 className="text-lg font-bold text-white">Transparencia Operativa</h2>
        </div>
        <p className="mb-5 text-sm text-zinc-400">Distribución real del gasto mensual de Sanctify.</p>
        <div className="mb-4 flex h-8 w-full overflow-hidden rounded-full bg-zinc-900">
          {expenseDistribution.map((expense) => (
            <div
              key={expense.label}
              className={expense.color}
              style={{ width: `${expense.percentage}%` }}
              title={`${expense.label}: ${expense.percentage}%`}
            />
          ))}
        </div>
        <div className="space-y-3">
          {expenseDistribution.map((expense) => (
            <div key={expense.label} className="flex items-center gap-3">
              <span className={`h-3 w-3 shrink-0 rounded-full ${expense.color}`} />
              <span className="flex-1 text-sm text-zinc-300">{expense.label}</span>
              <span className="text-sm font-bold text-white">{expense.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
