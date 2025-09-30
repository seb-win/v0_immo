// /components/object/ActiveSourceCard.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type RunMeta = { id: string; filename: string | null; finished_at: string | null; has_data?: boolean };
type StateResp = {
  activeIntakeId: string | null;
  usedSource: 'run'|'dummy';
  raw: Record<string, any>;
  overrides: Record<string, any>;
  merged: Record<string, any>;
  runs: RunMeta[];
  overridesUpdatedAt: string | null;
};

const PREVIEW_FIELDS: { key: string; label: string; format?: (v:any)=>string }[] = [
  { key: 'adresse', label: 'Adresse' },
  { key: 'wohnflaeche_qm', label: 'Wohnfläche (m²)', format: v => v==null?'':String(v) },
  { key: 'zimmer', label: 'Zimmer', format: v => v==null?'':String(v) },
  { key: 'baujahr', label: 'Baujahr', format: v => v==null?'':String(v) },
  { key: 'energie_kennwert', label: 'Energie-Kennwert', format: v => v==null?'':String(v) },
  { key: 'beschreibung', label: 'Beschreibung' },
];

export function ActiveSourceCard({ objectId }: { objectId: string }) {
  const [state, setState] = useState<StateResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [open, setOpen]     = useState(false); // Modal

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/objects/${objectId}/intake-state`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'load_failed');
      setState(json);
    } catch (e:any) {
      setError(e?.message ?? 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [objectId]);

    // Aktualisiere, wenn andere Komponenten die Quelle umstellen
  useEffect(() => {
    const handler = () => load();
    window.addEventListener('intake:source-changed', handler as EventListener);
    return () => window.removeEventListener('intake:source-changed', handler as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectId]);


  const headerText = useMemo(() => {
    if (!state) return '';
    if (state.usedSource === 'dummy') return 'Aktive Quelle: Testdaten (Dummy)';
    const run = state.runs.find(r => r.id === state.activeIntakeId);
    const date = run?.finished_at ? new Date(run.finished_at).toLocaleDateString() : 'ohne Datum';
    const file = run?.filename ?? 'upload.pdf';
    return `Aktive Quelle: ${file} (${date})`;
  }, [state]);

  if (loading) return <div className="rounded-xl border p-4 text-sm text-gray-600">Lade aktive Quelle …</div>;
  if (error)   return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!state)  return null;

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Aktive Quelle</h3>
        <div className="text-xs text-gray-600">{headerText}</div>
      </div>

      {/* Preview der wichtigsten Rohfelder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PREVIEW_FIELDS.map(f => {
          const display = f.format ? f.format(state.raw?.[f.key]) : (state.raw?.[f.key] ?? '');
          return (
            <div key={f.key} className="border rounded-lg p-3">
              <div className="text-xs text-gray-500">{f.label}</div>
              <div className="text-sm">{display || <span className="text-gray-400">—</span>}</div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <button
          className="rounded-md border px-3 py-1.5 text-sm"
          onClick={() => setOpen(true)}
        >
          Alle Felder anzeigen
        </button>
        <Link
          href={`/objekte/${objectId}/objektdaten`}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          Zu Objektdaten wechseln
        </Link>
      </div>

      {/* Modal: alle Rohwerte */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          {/* panel */}
          <div className="relative z-10 w-[95vw] max-w-3xl rounded-xl bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-semibold">Alle Felder der aktiven Aufnahme (read-only)</h4>
              <button className="text-sm underline" onClick={() => setOpen(false)}>Schließen</button>
            </div>

            {/* optional: Suchfeld */}
            {/* <input className="mb-3 w-full border rounded-md px-3 py-2 text-sm" placeholder="Felder durchsuchen …" /> */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[70vh] overflow-auto">
              {Object.entries(state.raw ?? {}).map(([k, v]) => (
                <div key={k} className="border rounded-lg p-3">
                  <div className="text-xs text-gray-500">{k}</div>
                  <div className="text-sm break-words">
                    {typeof v === 'object' ? JSON.stringify(v) : String(v ?? '') || <span className="text-gray-400">—</span>}
                  </div>
                </div>
              ))}
              {Object.keys(state.raw ?? {}).length === 0 && (
                <div className="text-sm text-gray-600">Keine Rohdaten vorhanden.</div>
              )}
            </div>

            <div className="mt-3 text-xs text-gray-500">
              Bearbeitung findet im Tab <b>Objektdaten</b> statt.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
