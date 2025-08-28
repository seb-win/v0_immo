'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import DocumentsTab from '@/components/documents/DocumentsTab';

export default function DokumentePage({ params }: { params: { id: string } }) {
  const propertyId = params.id;
  const router = useRouter();
  const supabase = supabaseBrowser();

  // ✨ RLS-Guard: keine Row → kein Zugriff → zurück zu /objekte
  useEffect(() => {
    supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .maybeSingle()
      .then(({ data }) => { if (!data) router.replace('/objekte'); });
  }, [propertyId, router, supabase]);

  return (
    <div className="p-4">
      <DocumentsTab propertyId={propertyId} />
    </div>
  );
}
