
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mryvubsvdljptejgpafs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yeXZ1YnN2ZGxqcHRlamdwYWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MzcxMjYsImV4cCI6MjA2NTIxMzEyNn0.FygZhegJYxNTYgdVAGiel5TLVWMi2hV4B6yjvvea80o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface User {
  id: string;
  email: string;
  role: 'fueler' | 'cto';
  approved: boolean;
  created_at: string;
}

export interface Site {
  id: string;
  site_id: string;
  last_fueling_date: string;
  fuel_capacity: number;
  current_fuel_level: number;
  created_at: string;
  consumptionPercentage?: number;
  daysSinceLastFueling?: number;
}

export interface Ticket {
  id: string;
  site_id: string;
  fueler_id: string;
  ticket_type: 'uplift' | 'dispersion';
  status: 'pending' | 'approved' | 'rejected' | 'closed';
  initiated: boolean;
  fuel_consumption: number;
  consumption_percentage: number;
  cto_comments?: string;
  fueler_input?: any;
  created_at: string;
  updated_at: string;
}
