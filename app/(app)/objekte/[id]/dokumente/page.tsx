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
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!active) return;

      if (!session) {
        router.push('/auth/login');
        return;
      }

      setChecking(false);
    })();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  if (checking) {
    // Kein zusätzliches p-4 hier – Objekt-Layout kümmert sich um das Padding
    return (
      <div>
        <h2 className="text-lg font-semibold">Dokumente</h2>
        <p className="mt-2 text-sm text-gray-600">Prüfe Zugriffsrechte …</p>
        <div className="mt-4 h-2 w-48 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  // Ebenfalls: direkt rendern, ohne extra Wrapper mit p-4
  return <DocumentsTab propertyId={propertyId} />;
}
