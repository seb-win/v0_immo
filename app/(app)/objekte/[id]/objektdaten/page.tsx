'use client';

import { ObjectDataPanel } from '@/components/object/ObjectDataPanel';

export default function ObjektdatenPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-8">
      <ObjectDataPanel objectId={params.id} />
    </div>
  );
}
