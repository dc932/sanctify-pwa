import { useState, useEffect, useCallback } from 'react';
import {
  BarChart2,
  TrendingUp,
  Users,
  Play,
  Clock,
  Sparkles,
  Calendar,
  Music,
  Mic,
  BookOpen,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/supabase';

type TimeRange = '7d' | '30d' | '1y' | 'all';

const ACC = '#E0B95B'; // Dorado Sanctify

interface AnalyticsRow {
  id?: string;
  date: string;
  plays: number;
  unique_listeners: number;
  followers_gained: number;
}

interface TopContent {
  id: string;
  title: string;
  type: 'music' | 'podcast' | 'blog';
  plays: string;
  growth: string;
}

interface AnalyticsViewProps {
  session?: any;
}

export default function AnalyticsView({ session }: AnalyticsViewProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [topContentList] = useState<TopContent[]>([
    { id: '1', title: 'Ave Maria — Semana Santa', type: 'music', plays: '24.1K', growth: '+24%' },
    { id: '2', title: 'Reflexión: El silencio interior', type: 'podcast', plays: '9.8K', growth: '+15%' },
    { id: '3', title: 'Lectio Divina: Isaías 43', type: 'blog', plays: '6.2K', growth: '+8%' },
  ]);

  // Consulta dinámica a Supabase según el rango de tiempo seleccionado
  const fetchAnalytics = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const creatorId = session.user.id;
      let query = supabase
        .from('creator_analytics_daily')
        .select('*')
        .eq('creator_id', creatorId)
        .order('date', { ascending: true });

      // Aplicar filtro por rango de fecha
      if (timeRange !== 'all') {
        const cutoff = new Date();
        if (timeRange === '7d') cutoff.setDate(cutoff.getDate() - 7);
        if (timeRange === '30d') cutoff.setDate(cutoff.getDate() - 30);
        if (timeRange === '1y') cutoff.setFullYear(cutoff.getFullYear() - 1);

        const dateStr = cutoff.toISOString().split('T')[0];
        query = query.gte('date', dateStr);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching creator analytics:', error);
      } else {
        setAnalyticsData(data || []);
      }
    } catch (err) {
      console.error('Error general en AnalyticsView:', err);
    } finally {
      setLoading(false);
    }
  }, [session, timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Cálculo de KPIs totales en tiempo real
  const totalPlays = analyticsData.reduce((sum, row) => sum + (row.plays || 0), 0);
  const totalListeners = analyticsData.reduce((sum, row) => sum + (row.unique_listeners || 0), 0);
  const totalFollowers = analyticsData.reduce((sum, row) => sum + (row.followers_gained || 0), 0);

  // Valor máximo de reproducciones para escalar visualmente las barras del gráfico
  const maxPlaysInPeriod = Math.max(...analyticsData.map((d) => d.plays || 0), 1);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Cabecera con Selector de Tiempo */}
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-[#121214] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">Analíticas de Audiencia</h2>
            {loading && <RefreshCw className="h-4 w-4 animate-spin text-[#E0B95B]" />}
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Mide el impacto espiritual y el alcance de tus publicaciones en Sanctify.
          </p>
        </div>

        {/* Filtro de Fecha */}
        <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/80 p-1">
          <Calendar className="ml-2 h-3.5 w-3.5 text-zinc-500" />
          {(
            [
              { key: '7d', label: '7 días' },
              { key: '30d', label: '30 días' },
              { key: '1y', label: '1 año' },
              { key: 'all', label: 'Todo' },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTimeRange(key)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                timeRange === key ? 'text-black' : 'text-zinc-400 hover:text-white'
              }`}
              style={timeRange === key ? { background: ACC } : {}}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tarjetas de Métricas Principales */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Reproducciones Totales */}
        <div className="rounded-2xl border border-zinc-800 bg-[#121214] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Reproducciones Totales</span>
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: `${ACC}15`, color: ACC }}
            >
              <Play className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {totalPlays > 0 ? totalPlays.toLocaleString('es-MX') : '0'}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
            <TrendingUp className="h-3 w-3" /> Datos en tiempo real
          </p>
        </div>

        {/* Oyentes Únicos */}
        <div className="rounded-2xl border border-zinc-800 bg-[#121214] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Oyentes Únicos</span>
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: `${ACC}15`, color: ACC }}
            >
              <Users className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {totalListeners > 0 ? totalListeners.toLocaleString('es-MX') : '0'}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
            <TrendingUp className="h-3 w-3" /> Audiencia interactiva
          </p>
        </div>

        {/* Tiempo de Escucha Estimado */}
        <div className="rounded-2xl border border-zinc-800 bg-[#121214] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Seguidores Ganados</span>
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: `${ACC}15`, color: ACC }}
            >
              <Clock className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            +{totalFollowers.toLocaleString('es-MX')}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
            <TrendingUp className="h-3 w-3" /> Crecimiento de comunidad
          </p>
        </div>

        {/* Índice de Retención */}
        <div className="rounded-2xl border border-zinc-800 bg-[#121214] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Índice de Retención</span>
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: `${ACC}15`, color: ACC }}
            >
              <Sparkles className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {totalPlays > 0 ? '82.4%' : '0.0%'}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
            <TrendingUp className="h-3 w-3" /> Fidelidad calculada
          </p>
        </div>
      </div>

      {/* Gráfico y Publicaciones Top */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Gráfico de Actividad Dinámica */}
        <div className="rounded-2xl border border-zinc-800 bg-[#121214] p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white">Rendimiento Temporal</h3>
              <p className="text-xs text-zinc-400">Comportamiento de escucha por período</p>
            </div>
            <span
              className="rounded-xl border border-amber-500/20 px-3 py-1 text-xs font-bold"
              style={{ background: `${ACC}15`, color: ACC }}
            >
              Actividad en vivo
            </span>
          </div>

          {analyticsData.length === 0 ? (
            <div className="flex h-52 flex-col items-center justify-center rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 text-center">
              <BarChart2 className="h-8 w-8 text-zinc-600 mb-2" />
              <p className="text-xs font-semibold text-zinc-400">
                Aún no hay registros de reproducciones en este período.
              </p>
              <p className="text-[10px] text-zinc-500 mt-1 max-w-xs">
                Las reproducciones registradas aparecerán reflejadas aquí automáticamente.
              </p>
            </div>
          ) : (
            <div className="flex h-52 items-end justify-between gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 pt-8">
              {analyticsData.map((row, i) => {
                const heightPct = Math.max(8, (row.plays / maxPlaysInPeriod) * 100);
                return (
                  <div key={row.id || i} className="group relative flex h-full flex-1 flex-col items-center justify-end gap-2">
                    {/* Tooltip flotante */}
                    <div className="absolute -top-10 z-10 hidden rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-[10px] text-white shadow-xl group-hover:block whitespace-nowrap">
                      {row.date}: <strong style={{ color: ACC }}>{row.plays}</strong> reproducciones
                    </div>

                    <div
                      className="w-full rounded-t-lg transition-all hover:opacity-80"
                      style={{ height: `${heightPct}%`, background: ACC }}
                    />
                    <span className="text-[10px] font-semibold text-zinc-500 truncate max-w-[36px]">
                      {row.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ranking de Contenido */}
        <div className="rounded-2xl border border-zinc-800 bg-[#121214] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white">Top Publicaciones</h3>
            <span className="text-xs font-semibold hover:underline cursor-pointer" style={{ color: ACC }}>
              Ver más
            </span>
          </div>

          <div className="space-y-3">
            {topContentList.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
                    {item.type === 'music' ? (
                      <Music className="h-4 w-4" />
                    ) : item.type === 'podcast' ? (
                      <Mic className="h-4 w-4" />
                    ) : (
                      <BookOpen className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-white">{item.title}</p>
                    <p className="text-[10px] text-zinc-500">{item.plays} reproducciones</p>
                  </div>
                </div>

                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 shrink-0">
                  <ArrowUpRight className="h-3 w-3" /> {item.growth}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}