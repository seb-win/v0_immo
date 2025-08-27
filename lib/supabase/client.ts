// lib/supabase/client.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient {
  if (_client) return _client;

  // WICHTIG: statischer Zugriff, sonst ersetzt Next.js die Variablen nicht
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  if (!anonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');

  _client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    global: { headers: { 'x-application': 'real-estate-saas' } },
  });

  return _client;
}

export function ensureClientSide() {
  if (typeof window === 'undefined') {
    throw new Error('supabaseBrowser() nur im Browser verwenden');
  }
}
