import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PostgrestResponse } from '@supabase/supabase-js';

interface TicketStats {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  loading: boolean;
  error: string | null;
}

export const useTicketStats = () => {
  const [stats, setStats] = useState<TicketStats>({
    totalTickets: 0,
    openTickets: 0,
    closedTickets: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total tickets
        const { data: totalData, error: totalError } = await supabase
          .from('Fuel Request')
          .select('*', { count: 'exact', head: true });

        if (totalError) throw totalError;

        // Get open tickets
        const { data: openData, error: openError } = await supabase
          .from('Fuel Request')
          .select('*', { count: 'exact', head: true })
          .eq('Ticket Status', 'Open');

        if (openError) throw openError;

        // Get closed tickets
        const { data: closedData, error: closedError } = await supabase
          .from('Fuel Request')
          .select('*', { count: 'exact', head: true })
          .eq('Ticket Status', 'Closed');

        if (closedError) throw closedError;

        setStats({
          totalTickets: totalData?.length || 0,
          openTickets: openData?.length || 0,
          closedTickets: closedData?.length || 0,
          loading: false,
          error: null,
        });
      } catch (error) {
        setStats(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'An error occurred',
        }));
      }
    };

    fetchStats();
  }, []);

  return stats;
};

export default useTicketStats; 