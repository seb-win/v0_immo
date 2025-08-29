'use client';
{file && <span className="text-sm text-gray-700">{file.name}</span>}
</div>


{/* Progress */}
{file && (
<div className="mt-3">
<div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
<div className="h-2 bg-gray-900 transition-all" style={{ width: `${progress}%` }} />
</div>
<div className="text-xs text-gray-500 mt-1">Upload: {progress}%</div>
</div>
)}
</section>


{/* Runs-Tabelle */}
<section className="border rounded-xl p-4">
<div className="flex items-center justify-between">
<h3 className="font-medium">Verarbeitungen</h3>
</div>
<div className="mt-3 overflow-x-auto">
<table className="w-full text-sm">
<thead>
<tr className="text-left text-gray-600">
<th className="py-2 pr-3">Datei</th>
<th className="py-2 pr-3">Uploadzeit</th>
<th className="py-2 pr-3">Status</th>
<th className="py-2 pr-3">Dauer</th>
<th className="py-2 pr-3">Aktionen</th>
</tr>
</thead>
<tbody>
{runs.map((r) => (
<tr key={r.id} className="border-t">
<td className="py-2 pr-3">{r.filename}</td>
<td className="py-2 pr-3 whitespace-nowrap">{r.uploadedAt}</td>
<td className="py-2 pr-3"><StatusBadge status={r.status} /></td>
<td className="py-2 pr-3">{r.durationSec ? `${r.durationSec}s` : '–'}</td>
<td className="py-2 pr-3 flex gap-2">
<button className="text-xs underline">Details</button>
{r.status === 'succeeded' ? (
<a className="text-xs underline" href={`./objektaufnahme/${r.id}/edit`}>Im Editor öffnen</a>
) : null}
</td>
</tr>
))}
</tbody>
</table>
</div>
</section>


{/* Ergebnis-Box (zuletzt erfolgreich) – Platzhalter */}
<section className="border rounded-xl p-4">
<h3 className="font-medium">Ergebnis (zuletzt erfolgreich)</h3>
<p className="text-sm text-gray-600 mt-1">Schema v1 · Parser OK (2 Warnungen)</p>
<div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
<div className="border rounded-lg p-3"><div className="text-gray-500">Adresse</div><div>Musterstraße 12, Berlin</div></div>
<div className="border rounded-lg p-3"><div className="text-gray-500">Wohnfläche</div><div>120 m²</div></div>
<div className="border rounded-lg p-3"><div className="text-gray-500">Zimmer</div><div>4</div></div>
<div className="border rounded-lg p-3"><div className="text-gray-500">Baujahr</div><div>1996</div></div>
<div className="border rounded-lg p-3"><div className="text-gray-500">Energie</div><div>Bedarf 85 kWh/(m²·a)</div></div>
</div>
<div className="mt-4 flex gap-2">
<a className="px-3 py-1.5 rounded-md bg-gray-900 text-white text-sm" href={`./objektaufnahme/run_001/edit`}>Im Editor öffnen</a>
<button className="px-3 py-1.5 rounded-md border text-sm">JSON downloaden</button>
</div>
</section>
</div>
);
}
