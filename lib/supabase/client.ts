// lib/supabase/client.ts
// Lightweight Browser-Client (Singleton) für Supabase – nur im Client verwenden
// Benötigt ENV: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return v;
}

/**
 * Liefert einen persistenten Browser-Client für Supabase.
 * - persistSession: true (LocalStorage)
 * - autoRefreshToken: true
 *
 * Wichtig: In Server Components NICHT verwenden; dafür eine separate Server-Factory anlegen (z. B. lib/supabase/server.ts)
 */
export function supabaseBrowser(): SupabaseClient {
  if (_client) return _client;

  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  _client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'x-application': 'real-estate-saas',
      },
    },
  });

  return _client;
}

/**
 * Optional: Helfer, um sicherzustellen, dass der Client nur im Browser genutzt wird.
 */
export function ensureClientSide() {
  if (typeof window === 'undefined') {
    throw new Error('supabaseBrowser() wird serverseitig verwendet. Bitte in Client Components nutzen oder eine Server-Factory erstellen.');
  }
}
