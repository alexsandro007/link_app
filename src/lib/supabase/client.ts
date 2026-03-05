import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// createBrowserClient автоматически синхронизирует сессию в cookies,
// которые серверный proxy.ts может прочитать и пропустить на /dashboard
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
