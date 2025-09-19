'use client';
import { useEffect, useState } from 'react';

export default function IntakeEditorPage({ params }: { params: { id: string; intakeId: string } }) {
  const { intakeId, id: objectId } = params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState<any>({
    adresse: '',
    wohnflaeche_qm: '',
    zimmer: '',
    baujahr: '',
    energie_kennwert: '',
    beschreibung: '',
  });

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/intake/editor?intakeId=${encodeURIComponent(intakeId)}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'load_failed');
      const m = json?.merged ?? {};
      setForm({
        adresse: m.adresse ?? '',
        wohnflaeche_qm: m.wohnflaeche_qm ?? '',
        zimmer: m.zimmer ?? '',
        baujahr: m.baujahr ?? '',
        energie_kennwert: m.energie_kennwert ?? '',
        beschreibung: m.beschreibung ?? '',
      });
    } catch (e: any) {
      setError(e?.message ?? 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [intakeId]);

  function onChange<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      const patch: any = {
        schema_version: 'v1',
        adresse: form.adresse || undefined,
        wohnflaeche_qm: form.wohnflaeche_qm,
        zimmer: form.zimmer,
        baujahr: form.baujahr,
        energie_kennwert: form.energie_kennwert,
        beschreibung: form.beschreibung || undefined,
      };
      const res = await fetch('/api/intake/editor/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intakeId, patch }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'save_failed');
      setMsg('Gespeichert.');
      // Nachladen, damit gemergte Sicht sicher aktuell ist
      await loadData();
    } catch (e: any) {
      setError(e?.message ?? 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-4 text-sm text-gray-600">Lade Editor …</div>;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Objektaufnahme bearbeiten</h2>
          <p className="text-xs text-gray-500">Objekt: {objectId} · Intake: {intakeId}</p>
        </div>
        <div className="flex gap-2">
          <button
            className={`px-3 py-1.5 rounded-md text-sm border ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
            onClick={onSave}
            disabled={saving}
          >
            {saving ? 'Speichern…' : 'Speichern'}
          </button>
        </div>
      </header>

      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {msg && <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{msg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="border rounded-xl p-4">
          <h3 className="font-medium">Basisdaten</h3>
          <div className="mt-3 space-y-3 text-sm">
            <label className="block">
              <span className="text-gray-600">Adresse</span>
              <input className="mt-1 w-full border rounded-md px-3 py-2"
                     value={form.adresse}
                     onChange={(e) => onChange('adresse', e.target.value)} />
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="text-gray-600">Wohnfläche (m²)</span>
                <input type="number" className="mt-1 w-full border rounded-md px-3 py-2"
                       value={form.wohnflaeche_qm}
                       onChange={(e) => onChange('wohnflaeche_qm', e.target.value)} />
              </label>
              <label className="block">
                <span className="text-gray-600">Zimmer</span>
                <input type="number" className="mt-1 w-full border rounded-md px-3 py-2"
                       value={form.zimmer}
                       onChange={(e) => onChange('zimmer', e.target.value)} />
              </label>
              <label className="block">
                <span className="text-gray-600">Baujahr</span>
                <input type="number" className="mt-1 w-full border rounded-md px-3 py-2"
                       value={form.baujahr}
                       onChange={(e) => onChange('baujahr', e.target.value)} />
              </label>
            </div>
          </div>
        </section>

        <section className="border rounded-xl p-4">
          <h3 className="font-medium">Energie</h3>
          <div className="mt-3 space-y-3 text-sm">
            <label className="block">
              <span className="text-gray-600">Energie-Kennwert</span>
              <input type="number" className="mt-1 w-full border rounded-md px-3 py-2"
                     value={form.energie_kennwert}
                     onChange={(e) => onChange('energie_kennwert', e.target.value)} />
            </label>
          </div>
        </section>

        <section className="md:col-span-2 border rounded-xl p-4">
          <h3 className="font-medium">Beschreibung</h3>
          <textarea className="mt-3 w-full border rounded-md px-3 py-2 min-h-[120px]"
                    value={form.beschreibung}
                    onChange={(e) => onChange('beschreibung', e.target.value)} />
        </section>
      </div>
    </div>
  );
}
