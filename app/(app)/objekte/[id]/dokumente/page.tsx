import DocumentsTab from '@/components/documents/DocumentsTab';


export default async function DokumentePage({ params }: { params: { id: string } }) {
// Server Component Wrapper – gibt nur die PropertyId an die Client-Komponente weiter
const propertyId = params.id;
return (
<div className="p-4">
<DocumentsTab propertyId={propertyId} />
</div>
);
}
