import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getUserId } from './useUserId';

interface UserStats {
  id: string;
  user_id: string;
  games_viewed: number;
  games_downloaded: number;
  favorites_count: number;
  chat_messages_sent: number;
  total_time_spent: number;
  first_visit: string;
  last_visit: string;
  streak_days: number;
  longest_streak: number;
}

export const useUserStats = () => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;

    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      const { data: newData } = await supabase
        .from('user_stats')
        .insert({ user_id: userId })
        .select()
        .single();
      
      if (newData) setStats(newData);
    } else if (data) {
      const lastVisit = new Date(data.last_visit);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
      
      let newStreakDays = data.streak_days;
      let newLongestStreak = data.longest_streak;

      if (diffDays === 1) {
        newStreakDays += 1;
        if (newStreakDays > newLongestStreak) {
          newLongestStreak = newStreakDays;
        }
      } else if (diffDays > 1) {
        newStreakDays = 1;
      }

      if (diffDays >= 1) {
        await supabase
          .from('user_stats')
          .update({ 
            last_visit: now.toISOString(),
            streak_days: newStreakDays,
            longest_streak: newLongestStreak
          })
          .eq('user_id', userId);
      }

      setStats({ ...data, streak_days: newStreakDays, longest_streak: newLongestStreak });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const incrementStat = async (stat: 'games_viewed' | 'games_downloaded' | 'favorites_count' | 'chat_messages_sent') => {
    const userId = getUserId();
    if (!userId) return;

    // Fetch current stats if not loaded yet
    let currentStats = stats;
    if (!currentStats) {
      const { data } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (data) {
        currentStats = data;
        setStats(data);
      } else {
        // Create new stats record
        const { data: newData } = await supabase
          .from('user_stats')
          .insert({ user_id: userId })
          .select()
          .single();
        
        if (newData) {
          currentStats = newData;
          setStats(newData);
        }
      }
    }

    if (!currentStats) return;

    const newValue = (currentStats[stat] || 0) + 1;
    
    await supabase
      .from('user_stats')
      .update({ [stat]: newValue } as any)
      .eq('user_id', userId);

    setStats(prev => prev ? { ...prev, [stat]: newValue } : null);
  };

  return {
    stats,
    isLoading,
    incrementStat,
    refetch: fetchStats
  };
};
