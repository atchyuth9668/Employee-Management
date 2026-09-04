import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const looksLikePlaceholder = (v: string | undefined): boolean => {
  if (!v) return true;
  if (v.length < 20) return true;
  if (v.includes('your-project')) return true;
  if (v.includes('your-anon')) return true;
  if (v.includes('placeholder')) return true;
  return false;
};

const supabaseUrl = looksLikePlaceholder(rawUrl) ? '' : (rawUrl as string);
const supabaseAnonKey = looksLikePlaceholder(rawKey) ? '' : (rawKey as string);

export const isSupabaseConfigured = (): boolean =>
  supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

export const supabase = createClient(
  supabaseUrl || 'https://invalid.supabase.co',
  supabaseAnonKey || 'invalid-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: isSupabaseConfigured(),
      detectSessionInUrl: isSupabaseConfigured(),
      flowType: 'pkce',
      storage: window.localStorage,
      storageKey: 'field-ops-auth',
    },
    realtime: isSupabaseConfigured() ? { params: { eventsPerSecond: 10 } } : undefined,
  }
);

export type SupabaseClient = typeof supabase;