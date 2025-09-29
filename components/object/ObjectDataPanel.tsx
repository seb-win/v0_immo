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

const FIELDS: { key: string; label: string; format?: (v:any)=>string }[] = [
  { key: 'adresse', label: 'Adresse' },
  { key: 'wohnflaeche_qm', label: 'Wohnfläche (m²)', format: v => v==null?'':String(v) },
  { key: 'zimmer', label: 'Zimmer', format: v => v==null?'':String(v) },
  { key: 'baujahr', label: 'Baujahr', format: v => v==null?'':String(v) },
  { key: 'energie_kennwert', label: 'Energie-Kennwert', format: v => v==null?'':String(v) },
  { key: 'beschreibung', label: 'Beschreibung' },
];

export function ObjectDataPanel({ objectId }: { objectId: string }) {
  const [state, setState] = useState<StateResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  async function load() {
    setLoading(true);
    setError(null);
    setNotice(null);
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

  // Nur zwei Zustände: RAW (aus Aufnahme) oder DIFF (bearbeitet)
  const provenance = useMemo(() => {
    if (!state) return {};
    const p: Record<string,'RAW'|'DIFF'> = {};
    for (const f of FIELDS) {
      const k = f.key;
      const raw = state.raw?.[k];
      const ov  = state.overrides?.[k];
      p[k] = (ov === undefined || ov === raw) ? 'RAW' : 'DIFF';
    }
    return p;
  }, [state]);

  function onChange(k: string, v: any) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function onSave() {
    setSaving(true); setError(null); setNotice(null);
    try {
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
      setNotice('Gespeichert.');
    } catch (e:any) {
      setError(e?.message ?? 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="rounded-lg border p-4 text-sm text-gray-600">Lade Objektdaten …</div>;
  if (error)   return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!state)  return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Objektdaten (gültige Sicht)</h2>
          <div className="text-sm text-gray-600">
            Aktive Quelle: {state.usedSource === 'dummy'
              ? 'Testdaten (Dummy)'
              : `Aufnahme ${state.activeIntakeId?.slice(0,8)}…`}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/objekte/${objectId}/objektaufnahme?focus=quelle`}
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            Quelle ändern
          </Link>
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

      {notice && <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</div>}

      {/* Felder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIELDS.map(f => {
          const val = edit ? form[f.key] : state.merged?.[f.key];
          const pv = provenance[f.key];
          const badgeClass = pv==='RAW' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700';
          const badgeText  = pv==='RAW' ? 'Aus Aufnahme' : 'Bearbeitet';
          const display = f.format ? f.format(val) : (val ?? '');

          return (
            <div key={f.key} className="border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">{f.label}</div>
                <span className={`text-xs px-2 py-0.5 rounded ${badgeClass}`}>{badgeText}</span>
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
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-xs text-gray-500">
        Hinweis: Änderungen werden als Objekt-Overrides gespeichert. Die aktive Quelle kannst du im Tab „Objektaufnahme“ ändern.
      </div>
    </div>
  );
}
