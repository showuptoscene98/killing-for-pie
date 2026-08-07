import { createClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL || '';
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(url && anonKey);

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let client = null;

export function getSupabase() {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'kfp-supabase-auth',
      },
    });
  }
  return client;
}
