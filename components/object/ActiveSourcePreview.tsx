'use client';

import { useEffect, useMemo, useState } from 'react';

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

const FIELDS: { key: string; label: string; format?: (v:any)=>string }[] = [
  { key: 'adresse', label: 'Adresse' },
  { key: 'wohnflaeche_qm', label: 'Wohnfläche (m²)', format: v => v==null?'':String(v) },
  { key: 'zimmer', label: 'Zimmer', format: v => v==null?'':String(v) },
  { key: 'baujahr', label: 'Baujahr', format: v => v==null?'':String(v) },
  { key: 'energie_kennwert', label: 'Energie-Kennwert', format: v => v==null?'':String(v) },
  { key: 'beschreibung', label: 'Beschreibung' },
];

export function ActiveSourcePreview({ objectId }: { objectId: string }) {
  const [state, setState] = useState<StateResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    setNotice(null);
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

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [objectId]);

  async function pickSource(intakeId: string) {
    setError(null); setNotice(null);
    const res = await fetch(`/api/objects/${objectId}/intake-source`, {
      method: 'POST',
      headers: { 'content-type':'application/json' },
      body: JSON.stringify({ intakeId })
    });
    const json = await res.json().catch(()=>null);
    if (!res.ok) {
      setError(json?.error ?? 'Quellwechsel fehlgeschlagen');
      return;
    }
    await load();
    setNotice('Quelle geändert. Bearbeitung im Tab „Objektdaten“ möglich.');
  }

  const headerText = useMemo(() => {
    if (!state) return '';
    if (state.usedSource === 'dummy') return 'Aktive Quelle: Testdaten (Dummy)';
    const date = state.runs.find(r => r.id === state.activeIntakeId)?.finished_at;
    return `Aktive Quelle: Aufnahme ${state.activeIntakeId?.slice(0,8)}…${date ? ' vom ' + new Date(date).toLocaleDateString() : ''}`;
  }, [state]);

  if (loading) return <div className="rounded-lg border p-4 text-sm text-gray-600">Lade Quelle …</div>;
  if (error)   return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!state)  return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">{headerText}</div>
        <div className="flex gap-2">
          <select
            className="border rounded-md px-2 py-1 text-sm"
            value={state.activeIntakeId ?? ''}
            onChange={(e)=>pickSource(e.target.value)}
          >
            <option value="" disabled>Quelle wählen…</option>
            {state.runs.map(r => {
              const date = r.finished_at ? new Date(r.finished_at).toLocaleDateString() : 'ohne Datum';
              const label = `${date} · ${r.filename ?? 'upload.pdf'}${r.has_data ? '' : ' · ohne Daten'}`;
              return <option key={r.id} value={r.id}>{label}</option>;
            })}
          </select>
        </div>
      </div>

      {notice && <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</div>}

      <div className="rounded-xl border p-4">
        <div className="mb-2 text-sm text-gray-600">
          Vorschau (read-only) der **Rohdaten** der aktiven Aufnahme. Bearbeitung im Tab „Objektdaten“.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FIELDS.map(f => {
            const display = f.format ? f.format(state.raw?.[f.key]) : (state.raw?.[f.key] ?? '');
            return (
              <div key={f.key} className="border rounded-lg p-3">
                <div className="text-xs text-gray-500">{f.label}</div>
                <div className="text-sm">{display || <span className="text-gray-400">—</span>}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
