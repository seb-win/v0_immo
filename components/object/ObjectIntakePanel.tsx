'use client';
import { useEffect, useMemo, useState } from 'react';

type RunMeta = { id: string; filename: string | null; finished_at: string | null };
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
  { key: 'wohnflaeche_qm', label: 'Wohnfläche (m²)' , format: v => v==null?'':String(v) },
  { key: 'zimmer', label: 'Zimmer', format: v => v==null?'':String(v) },
  { key: 'baujahr', label: 'Baujahr', format: v => v==null?'':String(v) },
  { key: 'energie_kennwert', label: 'Energie-Kennwert', format: v => v==null?'':String(v) },
  { key: 'beschreibung', label: 'Beschreibung' },
];

export function ObjectIntakePanel({ objectId }: { objectId: string }) {
  const [state, setState] = useState<StateResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/objects/${objectId}/intake-state`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'load_failed');
      setState(json);
      setForm(json.merged ?? {});
    } catch (e:any) {
      setError(e?.message ?? 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [objectId]);

  const provenance = useMemo(() => {
    if (!state) return {};
    const p: Record<string,'RAW'|'OBJ'|'DIFF'|null> = {};
    for (const f of FIELDS) {
      const k = f.key;
      const raw = state.raw?.[k];
      const ov  = state.overrides?.[k];
      if (ov === undefined) p[k] = 'RAW';
      else if (ov === raw) p[k] = 'OBJ';     // technisch gleich, aber als Override gesetzt (kommt vor)
      else p[k] = 'DIFF';
    }
    return p;
  }, [state]);

  function onChange(k: string, v: any) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function onSave() {
    setSaving(true); setError(null);
    try {
      // baue Patch nur mit relevanten Keys
      const patch: Record<string, any> = {};
      for (const f of FIELDS) patch[f.key] = form[f.key];
      const res = await fetch(`/api/objects/${objectId}/overrides`, {
        method: 'POST', headers: { 'content-type':'application/json' },
        body: JSON.stringify({ patch }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'save_failed');
      await load();
      setEdit(false);
    } catch (e:any) {
      setError(e?.message ?? 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  }

  async function resetField(k: string) {
    const res = await fetch(`/api/objects/${objectId}/overrides?keys=${encodeURIComponent(k)}`, { method: 'DELETE' });
    await res.json();
    await load();
  }

  async function pickSource(intakeId: string) {
    const res = await fetch(`/api/objects/${objectId}/intake-source`, {
      method: 'POST', headers: { 'content-type':'application/json' },
      body: JSON.stringify({ intakeId })
    });
    await res.json();
    await load();
  }

  if (loading) return <div className="rounded-lg border p-4 text-sm text-gray-600">Lade extrahierte Daten …</div>;
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!state) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Quelle: {state.usedSource === 'dummy' ? 'Testdaten (Dummy)' : `Aufnahme ${state.activeIntakeId?.slice(0,8)}…`}
        </div>
        <div className="flex gap-2">
          <select
            className="border rounded-md px-2 py-1 text-sm"
            value={state.activeIntakeId ?? ''}
            onChange={(e)=>pickSource(e.target.value)}
          >
            <option value="" disabled>Quelle wählen…</option>
            {state.runs.map(r => (
              <option key={r.id} value={r.id}>
                {r.finished_at ? new Date(r.finished_at).toLocaleDateString() : 'ohne Datum'} · {r.filename ?? 'upload.pdf'}
              </option>
            ))}
          </select>
          <button className="rounded-md border px-3 py-1.5 text-sm" onClick={() => setEdit(v => !v)}>
            {edit ? 'Abbrechen' : 'Bearbeiten'}
          </button>
          {edit && (
            <button
              className={`rounded-md border px-3 py-1.5 text-sm ${saving ? 'opacity-60 cursor-not-allowed': ''}`}
              onClick={onSave}
              disabled={saving}
            >
              {saving ? 'Speichern…' : 'Speichern'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIELDS.map(f => {
          const val = edit ? form[f.key] : state.merged?.[f.key];
          const label = f.label;
          const pv = provenance[f.key];
          const badge = pv==='RAW' ? 'bg-gray-100 text-gray-700' : pv==='OBJ' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';
          const badgeText = pv==='RAW' ? 'aus Aufnahme' : pv==='OBJ' ? 'Override' : 'Override ≠ Aufnahme';
          const display = f.format ? f.format(val) : (val ?? '');

          return (
            <div key={f.key} className="border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">{label}</div>
                <span className={`text-xs px-2 py-0.5 rounded ${badge}`}>{badgeText}</span>
              </div>

              {!edit ? (
                <div className="mt-2 text-sm">
                  {display || <span className="text-gray-400">—</span>}
                </div>
              ) : (
                <div className="mt-2">
                  {f.key === 'beschreibung' ? (
                    <textarea
                      className="w-full border rounded-md px-3 py-2 min-h-[100px] text-sm"
                      value={form[f.key] ?? ''}
                      onChange={e => onChange(f.key, e.target.value)}
                    />
                  ) : (
                    <input
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      type={['wohnflaeche_qm','zimmer','baujahr','energie_kennwert'].includes(f.key) ? 'number' : 'text'}
                      value={form[f.key] ?? ''}
                      onChange={e => onChange(f.key, e.target.value)}
                    />
                  )}
                  {provenance[f.key] !== 'RAW' && (
                    <button className="mt-2 text-xs underline underline-offset-4"
                            onClick={()=>resetField(f.key)}>
                      Aufnahmewert wiederherstellen
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
