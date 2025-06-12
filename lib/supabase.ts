
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

export interface SiteId {
  id: string;
  site_id: string;
  last_fueling_date: string;
  fuel_capacity: number;
  current_fuel_level: number;
  created_at: string;
  consumptionPercentage?: number;
  daysSinceLastFueling?: number;
}

export interface FuelingTeam {
  id: string;
  team_name: string;
  location: string;
  created_at: string;
}

export interface Uplift {
  id: string;
  fuel_team: string;
  fueler_name: string;
  user_email: string;
  fuel_pump: string;
  pump_vendor: string;
  pump_location: string;
  actual_fuel_time: string;
  fuel_card: string;
  card_company?: string;
  fuel_quantity_collected: number;
  transaction: boolean;
  vehicle_image?: string;
  pump_reading_before?: string;
  pump_reading_after?: string;
  fuel_collected_image?: string;
  after_filled_tank_image?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'closed';
  created_at: string;
  updated_at?: string;
}

export interface FuelHistory {
  id: string;
  site_id: string;
  fuel_team: string;
  fuel_quantity: number;
  fuel_time: string;
  pump_vendor: string;
  created_at: string;
}

// Legacy types for backward compatibility
export interface Site extends SiteId {}
export interface Ticket extends Uplift {}
