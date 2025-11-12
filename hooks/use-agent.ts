'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function useAgent() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [isAgent, setIsAgent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // Session/User holen
        const { data: u } = await supabase.auth.getUser();
        const uid = u.user?.id;
        if (!uid) {
          if (alive) { setIsAgent(false); setLoading(false); }
          return;
        }

        // Nur die existierende Spalte 'role' lesen
        const { data: profile, error: profErr } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', uid)
          .single();

        if (profErr) {
          if (alive) { setError(profErr.message ?? 'profiles fetch error'); setIsAgent(false); setLoading(false); }
          return;
        }

        const role = String(profile?.role ?? '').toLowerCase();
        if (alive) {
          setIsAgent(role === 'agent');  // dein bestätigter Ground Truth
          setError(null);
          setLoading(false);
        }
      } catch (e: any) {
        if (alive) {
          setError(e?.message ?? 'role detection failed');
          setIsAgent(false);
          setLoading(false);
        }
      }
    })();

    return () => { alive = false; };
  }, [supabase]);

  return { isAgent, loading, error };
}
