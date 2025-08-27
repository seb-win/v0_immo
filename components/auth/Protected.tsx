'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function Protected({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancel = false;
    async function run() {
      const { data } = await supabaseBrowser().auth.getUser();
      if (cancel) return;
      setAuthed(!!data.user);
      setReady(true);
      if (!data.user) {
        // simple redirect; passe ggf. Route an
        window.location.href = '/login';
      }
    }
    run();
    return () => { cancel = true; };
  }, []);

  if (!ready || authed === null) return <div className="p-6">Lade…</div>;
  if (!authed) return null; // redirect läuft

  return <>{children}</>;
}
