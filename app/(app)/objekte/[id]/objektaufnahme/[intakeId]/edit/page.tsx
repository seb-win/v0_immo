'use client';
import { useEffect, useState } from 'react';

export default function IntakeEditorPage({ params }: { params: { id: string; intakeId: string } }) {
  const { intakeId } = params;
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/intake/editor?intakeId=${encodeURIComponent(intakeId)}`, { cache: 'no-store' });
      const json = await res.json();
      if (!alive) return;
      const m = json?.merged ?? {};
      setForm({
        adresse: m.adresse ?? '',
        wohnflaeche_qm: m.wohnflaeche_qm ?? '',
        zimmer: m.zimmer ?? '',
        baujahr: m.baujahr ?? '',
        energie_kennwert: m.energie_kennwert ?? '',
        beschreibung: m.beschreibung ?? '',
      });
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [intakeId]);

  function onChange<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function onSave() {
    const patch: any = {
      schema_version: 'v1',
      adresse: form.adresse || undefined,
      wohnflaeche_qm: form.wohnflaeche_qm === '' ? undefined : Number(form.wohnflaeche_qm),
      zimmer: form.zimmer === '' ? undefined : Number(form.zimmer),
      baujahr: form.baujahr === '' ? undefined : Number(form.baujahr),
      energie_kennwert: form.energie_kennwert === '' ? undefined : Number(form.energie_kennwert),
      beschreibung: form.beschreibung || undefined,
    };
    const res = await fetch('/api/intake/editor/save', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intakeId, patch }),
    });
    if (!res.ok) {
      // TODO: toast error
    } else {
      // TODO: toast success
    }
  }

  if (loading) return <div className="p-4">Lade Editor …</div>;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Objektaufnahme bearbeiten</h2>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-md border text-sm" onClick={onSave}>Speichern</button>
          {/* Später: In Objekt übernehmen */}
        </div>
      </header>

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
