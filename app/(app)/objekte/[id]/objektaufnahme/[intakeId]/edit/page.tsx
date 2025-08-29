'use client';
export default function IntakeEditorPage({ params }: { params: { id: string; intakeId: string } }) {
// TODO: Fetch result JSON by intakeId
const [form, setForm] = useState({
adresse: 'Musterstraße 12, 10999 Berlin',
wohnflaeche: 120,
zimmer: 4,
baujahr: 1996,
energie_kennwert: 85,
beschreibung: 'Helle 4-Zimmer-Wohnung …',
});


function onChange<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
setForm((f) => ({ ...f, [key]: value }));
}


return (
<div className="space-y-6">
<header className="flex items-center justify-between">
<div>
<h2 className="text-lg font-semibold">Objektaufnahme bearbeiten</h2>
<p className="text-sm text-gray-600">Intake-ID: {params.intakeId} · Objekt: {params.id}</p>
</div>
<div className="flex gap-2">
<button className="px-3 py-1.5 rounded-md border text-sm">JSON exportieren</button>
<button className="px-3 py-1.5 rounded-md bg-gray-900 text-white text-sm">Speichern</button>
</div>
</header>


<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
<section className="border rounded-xl p-4">
<h3 className="font-medium">Basisdaten</h3>
<div className="mt-3 space-y-3 text-sm">
<label className="block">
<span className="text-gray-600">Adresse</span>
<input className="mt-1 w-full border rounded-md px-3 py-2" value={form.adresse} onChange={(e) => onChange('adresse', e.target.value)} />
</label>
<div className="grid grid-cols-3 gap-3">
<label className="block">
<span className="text-gray-600">Wohnfläche (m²)</span>
<input type="number" className="mt-1 w-full border rounded-md px-3 py-2" value={form.wohnflaeche} onChange={(e) => onChange('wohnflaeche', Number(e.target.value))} />
</label>
<label className="block">
<span className="text-gray-600">Zimmer</span>
<input type="number" className="mt-1 w-full border rounded-md px-3 py-2" value={form.zimmer} onChange={(e) => onChange('zimmer', Number(e.target.value))} />
</label>
<label className="block">
<span className="text-gray-600">Baujahr</span>
<input type="number" className="mt-1 w-full border rounded-md px-3 py-2" value={form.baujahr} onChange={(e) => onChange('baujahr', Number(e.target.value))} />
</label>
</div>
</div>
</section>


<section className="border rounded-xl p-4">
<h3 className="font-medium">Energie</h3>
<div className="mt-3 space-y-3 text-sm">
<label className="block">
<span className="text-gray-600">Energie-Kennwert</span>
<input type="number" className="mt-1 w-full border rounded-md px-3 py-2" value={form.energie_kennwert} onChange={(e) => onChange('energie_kennwert', Number(e.target.value))} />
</label>
</div>
</section>


<section className="md:col-span-2 border rounded-xl p-4">
<h3 className="font-medium">Beschreibung</h3>
<textarea className="mt-3 w-full border rounded-md px-3 py-2 min-h-[120px]" value={form.beschreibung} onChange={(e) => onChange('beschreibung', e.target.value)} />
<div className="mt-3 flex gap-2">
<button className="px-3 py-1.5 rounded-md border text-sm">In Objekt übernehmen</button>
<button className="px-3 py-1.5 rounded-md border text-sm">In CRM speichern</button>
<button className="px-3 py-1.5 rounded-md border text-sm">Exposé-Text erzeugen</button>
</div>
</section>
</div>
</div>
);
}
