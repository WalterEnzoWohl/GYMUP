import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
const siteUrlFromEnv = import.meta.env.VITE_SITE_URL?.trim() ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase no esta configurado. Defini VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env.local.'
    );
  }

  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return client;
}

export function getAuthRedirectUrl() {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }

  return siteUrlFromEnv || undefined;
}
