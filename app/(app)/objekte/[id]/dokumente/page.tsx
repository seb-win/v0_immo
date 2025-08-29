'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import DocumentsTab from '@/components/documents/DocumentsTab';

export default function DokumentePage({ params }: { params: { id: string } }) {
  const propertyId = params.id;
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      // Neu: warte, bis Auth-Session steht
      const { data: sessionData } = await supabase.auth.getSession();
      // (Optional) wenn gar keine Session → redirect/login
      // if (!sessionData.session) { router.replace('/login'); return; }

      const { data, error } = await supabase
        .from('properties')
        .select('id')
        .eq('id', propertyId)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        router.replace('/objekte');
      } else {
        setChecking(false);
      }
    })();

    return () => { active = false; };
  }, [propertyId, router, supabase]);

  if (checking) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold">Dokumente</h2>
        <p className="mt-2 text-sm text-gray-600">Prüfe Zugriffsrechte …</p>
        <div className="mt-4 h-2 w-48 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <DocumentsTab propertyId={propertyId} />
    </div>
  );
}
