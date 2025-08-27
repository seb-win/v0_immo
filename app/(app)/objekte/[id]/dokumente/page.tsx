import DocumentsTab from '@/components/documents/DocumentsTab';
import Protected from '@/components/auth/Protected';

export default function DokumentePage({ params }: { params: { id: string } }) {
  const propertyId = params.id;
  return (
    <Protected>
      <div className="p-4">
        <DocumentsTab propertyId={propertyId} />
      </div>
    </Protected>
  );
}
