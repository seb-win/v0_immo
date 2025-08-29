'use client';
import Link from 'next/link';


export default function ObjektDetailsPage({ params }: { params: { id: string } }) {
// TODO: Fetch Objekt-Stammdaten per id (Server/Client)
const objekt = {
id: params.id,
adresse: 'Musterstraße 12, 10999 Berlin',
verkaeufer: 'Max Mustermann',
status: 'aktiv',
letzteObjektaufnahme: { at: '28.08.2025, 15:12', href: `/objekte/${params.id}/objektaufnahme` },
dokumenteCount: 17,
};


return (
<div className="space-y-6">
<header className="flex flex-col gap-1">
<h2 className="text-xl font-semibold">{objekt.adresse}</h2>
<p className="text-sm text-gray-600 dark:text-gray-400">Verkäufer: {objekt.verkaeufer} · Status: {objekt.status}</p>
<div className="flex gap-2 mt-2">
<button className="px-3 py-1.5 text-sm rounded-md bg-gray-900 text-white">Bearbeiten</button>
<button className="px-3 py-1.5 text-sm rounded-md border">Zum CRM</button>
<button className="px-3 py-1.5 text-sm rounded-md border">Exposé erzeugen</button>
</div>
</header>


<section className="grid grid-cols-1 md:grid-cols-2 gap-4">
<div className="border rounded-xl p-4">
<div className="flex items-center justify-between">
<h3 className="font-medium">Dokumente</h3>
<span className="text-sm text-gray-500">{objekt.dokumenteCount}</span>
</div>
<p className="text-sm text-gray-600 mt-1">Alle Dateien zum Objekt verwalten.</p>
<div className="mt-3">
<Link href={`/objekte/${objekt.id}/dokumente`} className="text-sm underline">Verwalten →</Link>
</div>
</div>


<div className="border rounded-xl p-4">
<h3 className="font-medium">Letzte Objektaufnahme</h3>
<p className="text-sm text-gray-600 mt-1">{objekt.letzteObjektaufnahme.at}</p>
<div className="mt-3">
<Link href={objekt.letzteObjektaufnahme.href} className="text-sm underline">Öffnen →</Link>
</div>
</div>


<div className="border rounded-xl p-4">
<h3 className="font-medium">Notizen / To-dos</h3>
<p className="text-sm text-gray-600 mt-1">(Platzhalter)</p>
</div>


<div className="border rounded-xl p-4">
<h3 className="font-medium">Käuferanfragen</h3>
<p className="text-sm text-gray-600 mt-1">(Geplant)</p>
</div>
</section>
</div>
);
}
