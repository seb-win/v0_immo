export default function BilderPage({ params }: { params: { id: string } }) {
return (
<div className="space-y-4">
<h2 className="text-lg font-semibold">Bilder</h2>
<div className="flex gap-2">
<button className="px-3 py-1.5 rounded-md border text-sm">+ Album anlegen</button>
<button className="px-3 py-1.5 rounded-md border text-sm">+ Fotos hochladen</button>
</div>
<p className="text-sm text-gray-600">(Platzhalter: Alben/Galerie, Tags, Notizen …)</p>
</div>
);
}
