import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

export interface CreatorStats {
  totalPlays: number;
  uniqueListeners: number;
  followersGained: number;
  totalEarnings: number;
  monthlyEarnings: number;
}

export interface BenefactorSponsor {
  id: string;
  sponsor_name: string;
  sponsor_avatar: string;
  tier: string;
  monthly_amount: number;
  joined_date: string;
}

export function useCreatorStudioData(session: any) {
  const [stats, setStats] = useState<CreatorStats>({
    totalPlays: 0,
    uniqueListeners: 0,
    followersGained: 0,
    totalEarnings: 0,
    monthlyEarnings: 0,
  });
  const [benefactors, setBenefactors] = useState<BenefactorSponsor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCreatorData = useCallback(async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const creatorId = session.user.id;

      // 1. Obtener analíticas diarias y sumar totales
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('creator_analytics_daily')
        .select('plays, unique_listeners, followers_gained')
        .eq('creator_id', creatorId);

      if (analyticsError) console.error('Error fetching analytics:', analyticsError);

      let playsSum = 0;
      let listenersSum = 0;
      let followersSum = 0;

      if (analyticsData && analyticsData.length > 0) {
        analyticsData.forEach((row) => {
          playsSum += row.plays || 0;
          listenersSum += row.unique_listeners || 0;
          followersSum += row.followers_gained || 0;
        });
      }

      // 2. Obtener ingresos (Pay It Forward / Donaciones)
      const { data: earningsData, error: earningsError } = await supabase
        .from('creator_earnings')
        .select('amount, created_at')
        .eq('creator_id', creatorId);

      if (earningsError) console.error('Error fetching earnings:', earningsError);

      let totalEarned = 0;
      let monthlyEarned = 0;
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      if (earningsData && earningsData.length > 0) {
        earningsData.forEach((row) => {
          const amount = Number(row.amount) || 0;
          totalEarned += amount;

          const rowDate = new Date(row.created_at);
          if (rowDate.getMonth() === currentMonth && rowDate.getFullYear() === currentYear) {
            monthlyEarned += amount;
          }
        });
      }

      // 3. Obtener Padrinos Benefactores
      const { data: benefactorsData, error: benefactorsError } = await supabase
        .from('benefactor_sponsors')
        .select('*')
        .eq('creator_id', creatorId)
        .order('monthly_amount', { ascending: false });

      if (benefactorsError) console.error('Error fetching benefactors:', benefactorsError);

      setStats({
        totalPlays: playsSum,
        uniqueListeners: listenersSum,
        followersGained: followersSum,
        totalEarnings: totalEarned,
        monthlyEarnings: monthlyEarned,
      });

      setBenefactors(benefactorsData || []);
    } catch (err) {
      console.error('Error general cargando datos del Creator Studio:', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchCreatorData();

    // Opcional: Escuchar cambios en tiempo real con Supabase Realtime si se requiere
    const earningsSubscription = supabase
      .channel('creator_earnings_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'creator_earnings', filter: `creator_id=eq.${session?.user?.id}` },
        () => {
          fetchCreatorData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(earningsSubscription);
    };
  }, [session, fetchCreatorData]);

  return { stats, benefactors, loading, refetch: fetchCreatorData };
}