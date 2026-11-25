import { useState } from 'react';
import {
  ArrowLeft,
  BarChart2,
  DollarSign,
  LayoutDashboard,
  Library,
  Menu,
  Play,
  RefreshCw,
  ShieldCheck,
  Upload,
  Users,
  X,
  Award,
  Layers,
} from 'lucide-react';
import UploadView from './creator/UploadView';
import LibraryView from './creator/LibraryView';
import AnalyticsView from './creator/AnalyticsView';
import EarningsView from './creator/EarningsView';
import AdminReviewView from './creator/AdminReviewView';
import AlbumManagerView from './creator/AlbumManagerView';
import { useCreatorStudioData } from '@/hooks/useCreatorStudioData';

type CreatorView = 'dashboard' | 'upload' | 'albums' | 'library' | 'review' | 'analytics' | 'earnings';

const ACC = '#E0B95B'; // Acento dorado elegante para Creator Studio

const navItems: { key: CreatorView; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'upload', label: 'Subir contenido', icon: Upload },
  { key: 'albums', label: 'Álbumes y Podcasts', icon: Layers },
  { key: 'library', label: 'Mi biblioteca', icon: Library },
  { key: 'review', label: 'Revisión (Admin)', icon: ShieldCheck },
  { key: 'analytics', label: 'Analíticas', icon: BarChart2 },
  { key: 'earnings', label: 'Ingresos', icon: DollarSign },
];

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

function formatCurrency(amount: number): string {
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

function VerifiedBadge({ isVerified }: { isVerified: boolean }) {
  if (!isVerified) return null;
  return (
    <div
      className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold"
      style={{ borderColor: `${ACC}40`, backgroundColor: `${ACC}15`, color: ACC }}
    >
      <ShieldCheck className="h-3.5 w-3.5" />
      Creador Verificado
    </div>
  );
}

interface DashboardViewProps {
  isVerified: boolean;
  onNavigate: (v: CreatorView) => void;
  statsData: {
    totalPlays: number;
    uniqueListeners: number;
    followersGained: number;
    totalEarnings: number;
    monthlyEarnings: number;
  };
  benefactorsData: any[];
  loading: boolean;
  refetch: () => void;
}

function DashboardView({
  isVerified,
  onNavigate,
  statsData,
  benefactorsData,
  loading,
  refetch,
}: DashboardViewProps) {
  const safeStats = {
    totalPlays: statsData?.totalPlays ?? 0,
    uniqueListeners: statsData?.uniqueListeners ?? 0,
    monthlyEarnings: statsData?.monthlyEarnings ?? 0,
  };
  const safeBenefactors = Array.isArray(benefactorsData) ? benefactorsData : [];

  const dynamicStats = [
    {
      label: 'Reproducciones totales',
      value: safeStats.totalPlays.toLocaleString(),
      delta: 'En tiempo real',
      icon: Play,
    },
    {
      label: 'Oyentes únicos',
      value: safeStats.uniqueListeners.toLocaleString(),
      delta: 'Audiencia activa',
      icon: Users,
    },
    {
      label: 'Ingresos del mes',
      value: formatCurrency(safeStats.monthlyEarnings),
      delta: 'Pay It Forward',
      icon: DollarSign,
    },
    {
      label: 'Padrinos activos',
      value: safeBenefactors.length.toString(),
      delta: 'Benefactores',
      icon: Award,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Banner de Bienvenida */}
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-[#121214] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-white">Bienvenido, Creador</h2>
            <VerifiedBadge isVerified={isVerified} />
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Resumen en tiempo real conectado con tu base de datos en Sanctify.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={loading}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs font-bold text-zinc-300 hover:text-white disabled:opacity-50 cursor-pointer"
            title="Sincronizar datos"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#E0B95B]' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('upload')}
            className="flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-black transition-transform hover:scale-[1.02] cursor-pointer"
            style={{ background: ACC }}
          >
            <Upload className="h-4 w-4" /> Subir contenido
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Dinámicas */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {dynamicStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border border-zinc-800 bg-[#121214] p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500">{stat.label}</p>
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{ background: `${ACC}15`, color: ACC }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold text-white">{stat.value}</p>
              <p className="mt-1 text-[11px] font-semibold text-emerald-400">{stat.delta}</p>
            </div>
          );
        })}
      </div>

      {/* Sección Padrinos Benefactores Recientes */}
      <div className="rounded-2xl border border-zinc-800 bg-[#121214] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-white">Padrinos Benefactores Activos</h3>
          <button
            type="button"
            onClick={() => onNavigate('earnings')}
            className="text-xs font-semibold hover:underline cursor-pointer"
            style={{ color: ACC }}
          >
            Ver finanzas
          </button>
        </div>

        {safeBenefactors.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            Aún no tienes Padrinos Benefactores registrados. Las donaciones mediante Pay It Forward
            aparecerán aquí automáticamente.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {safeBenefactors.map((sponsor) => (
              <div
                key={sponsor.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3"
              >
                <img
                  src={
                    sponsor.sponsor_avatar ||
                    'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=300'
                  }
                  alt={sponsor.sponsor_name || 'Benefactor'}
                  className="h-10 w-10 rounded-full border border-amber-500/30 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-white">
                    {sponsor.sponsor_name || 'Benefactor'}
                  </p>
                  <p className="text-[10px] font-semibold text-[#E0B95B]">{sponsor.tier || 'Padrino'}</p>
                  <p className="text-[10px] text-zinc-400">
                    {formatCurrency(sponsor.monthly_amount)}/mes
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface CreatorStudioProps {
  session: any;
  onClose: () => void;
  onOpenPayItForward?: () => void;
}

export default function CreatorStudio({
  session,
  onClose,
  onOpenPayItForward,
}: CreatorStudioProps) {
  const [activeView, setActiveView] = useState<CreatorView>('dashboard');
  const [isVerified] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { stats, benefactors, loading, refetch } = useCreatorStudioData(session);

  const activeItem = navItems.find((n) => n.key === activeView) ?? navItems[0];

  const ActiveIcon = activeItem.icon;

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0B] text-white">
      {/* Header Superior */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-[#0A0A0B]/95 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:text-white lg:hidden cursor-pointer"
              aria-label="Menú"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <img
                src="/Sanctify_Icon_black.png"
                alt="Sanctify"
                className="h-7 w-7 rounded-lg object-cover"
              />
              <div className="leading-none">
                <p className="text-sm font-bold text-white">Creator Studio</p>
                <p className="text-[10px] text-zinc-500">Sanctify for Creators</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <VerifiedBadge isVerified={isVerified} />
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-white cursor-pointer"
              aria-label="Volver a Sanctify"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Fondo oscuro móvil */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar Lateral */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-zinc-800 bg-[#0d0d0e] pt-14 transition-transform duration-200 lg:static lg:translate-x-0 lg:pt-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex-1 space-y-1 overflow-y-auto p-3 pt-4">
            {navItems.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveView(key);
                  setSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all cursor-pointer ${
                  activeView === key
                    ? 'text-[#0A0A0B]'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}
                style={activeView === key ? { background: ACC } : {}}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </div>

          <div className="border-t border-zinc-800/80 p-3 pb-6">
            <button
              type="button"
              onClick={onClose}
              className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 px-3 py-2.5 text-sm font-semibold text-zinc-400 transition-colors hover:border-zinc-700 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Modo Oyente
            </button>
          </div>
        </aside>

        {/* Área de Contenido Principal */}
        <main className="min-w-0 flex-1 overflow-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 flex items-center gap-2">
              <ActiveIcon className="h-5 w-5" style={{ color: ACC }} />
              <h1 className="text-xl font-bold text-white">{activeItem.label}</h1>
            </div>

            {activeView === 'dashboard' && (
              <DashboardView
                isVerified={isVerified}
                onNavigate={setActiveView}
                statsData={stats}
                benefactorsData={benefactors}
                loading={loading}
                refetch={refetch}
              />
            )}
            {activeView === 'upload' && <UploadView />}
            {activeView === 'albums' && <AlbumManagerView />}
            {activeView === 'library' && <LibraryView />}
            {activeView === 'review' && <AdminReviewView />}
            {activeView === 'analytics' && <AnalyticsView />}
            {activeView === 'earnings' && (
              <EarningsView onOpenPayItForward={onOpenPayItForward} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}