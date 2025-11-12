'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

/**
 * Normalisiert verschiedene Rollenrepräsentationen auf ein boolean "agent".
 */
function normalizeAgentLike(data: any): boolean {
  if (!data) return false;

  const toLower = (v: any) => (typeof v === 'string' ? v.toLowerCase() : v);

  // 1) Einfache String-Felder
  const stringKeys = ['role', 'role_key', 'org_role'];
  for (const key of stringKeys) {
    const val = toLower(data[key]);
    if (val === 'agent') return true;
  }

  // 2) Boolean-Flag
  if (data.is_agent === true) return true;

  // 3) Arrays
  const arrKeys = ['roles', 'permissions'];
  for (const key of arrKeys) {
    const v = data[key];
    if (Array.isArray(v)) {
      const lower = v.map((x) => String(x).toLowerCase());
      if (lower.includes('agent') || lower.includes('documents:create')) return true;
    }
  }

  return false;
}

type UseAgentOptions = {
  /** Query-Parameter zum lokalen Forcieren (nur Dev): ?debugAgent=1 */
  debugParam?: string;
};

export function useAgent(opts: UseAgentOptions = {}) {
  const { debugParam = 'debugAgent' } = opts;

  const supabase = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [isAgent, setIsAgent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // optionaler Debug-Override via Query (?debugAgent=1)
  const [debugOverride, setDebugOverride] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const qp = new URLSearchParams(window.location.search);
      if (qp.get(debugParam) === '1') {
        setDebugOverride(true);
      }
    } catch {
      // ignore
    }
  }, [debugParam]);

  const refresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) {
        setIsAgent(false);
        setLoading(false);
        return;
      }

      // Lies NUR das Profil (einheitliche Quelle)
      const { data: profile, error: profErr } = await supabase
        .from('profiles') // <— falls deine Tabelle anders heißt, hier anpassen
        .select('role, is_agent, roles, role_key, org_role, permissions')
        .eq('id', uid)
        .single();

      if (profErr) {
        setError(profErr.message ?? 'profiles fetch error');
        setIsAgent(false);
        setLoading(false);
        return;
      }

      // Primär: role (dein Fall: "agent" klein)
      const primary =
        (typeof profile?.role === 'string' &&
          profile.role.toLowerCase() === 'agent') || false;

      // Sekundär: tolerant auf andere Felder
      const tolerant = primary || normalizeAgentLike(profile) || normalizeAgentLike(u.user?.app_metadata) || normalizeAgentLike(u.user?.user_metadata);

      setIsAgent(Boolean(tolerant));
    } catch (e: any) {
      setError(e?.message ?? 'role detection failed');
      setIsAgent(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wenn Debug aktiv ist, übergehe die Abfrage
    if (debugOverride === true) {
      setIsAgent(true);
      setLoading(false);
      setError(null);
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debugOverride]);

  return { isAgent, loading, error, refresh };
}

export default useAgent;
