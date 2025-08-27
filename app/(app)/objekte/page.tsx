'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { createPropertiesRepo } from '@/lib/repositories/properties-repo';
import type { Property } from '@/lib/repositories/contracts';

type Role = 'agent' | 'customer';

export default function PropertiesPage() {
  return <PropertiesInner />;
}

function PropertiesInner() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const repo = useMemo(() => createPropertiesRepo(supabase), [supabase]);

  const [role, setRole] = useState<Role>('agent');
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;

    async function load() {
      setLoading(true);
      setErr(null);

      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) {
        if (!cancel) { setErr('Nicht eingeloggt'); setLoading(false); }
        return;
      }

      // Rolle ermitteln
      const prof = await supabase.from('profiles').select('role').eq('id', uid).single();
      const r = (prof.data?.role ?? 'agent') as Role;
      if (!cancel) setRole(r);

      if (r === 'agent') {
        // Agent: Repo (filtert intern auf agent_id = uid)
        const list = await repo.listProperties({ limit: 50 });
        if (!cancel) {
          if (list.ok) setItems(list.data.items);
          else setErr(list.error.message ?? 'Fehler beim Laden');
        }
      } else {
        // Customer: KEIN zusätzlicher Filter – RLS liefert nur zugewiesene Objekte
        const q = await supabase
          .from('properties')
          .select('id, title, address, agent_id, created_at, updated_at')
          .order('created_at', { ascending: false });

        if (!cancel) {
          if (q.error) setErr(q.error.message);
          else setItems((q.data ?? []) as Property[]);
        }
      }

      if (!cancel) setLoading(false);
    }

    void load();
    return () => { cancel = true; };
  }, [repo, supabase]);

  if (loading) return <div>Lade Objekte…</div>;
  if (err) return <div className="text-red-600">{err}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Objekte</h1>
        {role === 'agent' && <div className="text-sm text-gray-500">Neues Objekt anlegen (später)</div>}
      </div>

      <ul className="divide-y border rounded">
        {items.map((p) => (
          <li key={p.id} className="p-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-medium truncate">{p.title}</div>
              <div className="text-sm text-gray-500 truncate">{p.address ?? '—'}</div>
            </div>
            <div className="shrink-0">
              <Link href={`/objekte/${p.id}/dokumente`} className="px-3 py-1 border rounded hover:bg-gray-50">
                Dokumente
              </Link>
            </div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="p-3 text-gray-500">Keine Objekte gefunden.</li>
        )}
      </ul>
    </div>
  );
}
