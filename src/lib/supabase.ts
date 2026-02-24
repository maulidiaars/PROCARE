import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// HARDCODE MASTER USERS
export const MASTER_USERS = [
  { npk: '2121368', name: 'Hendrik', password: '2121368' },
  { npk: '2141210', name: 'Alberto', password: '2141210' }
];

// Tipe data untuk user
export type User = {
  npk: string;
  name: string;
  role: 'master' | 'staff';
  created_at?: string;
};