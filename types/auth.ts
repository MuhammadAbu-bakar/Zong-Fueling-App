import { User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'coordinator' | 'rm' | 'fueler' | 'security' | 'gtl';

export interface AuthUser extends User {
  role?: UserRole;
}

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  created_at?: string;
  last_sign_in_at?: string;
} 