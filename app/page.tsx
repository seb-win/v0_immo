"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Auth from "@/components/auth";
import { Loader2 } from "lucide-react";

/**
 * Startseite:
 * - Prüft NUR, ob eine Session existiert.
 * - Bei Session -> sofort nach /leads (Role-Gate im (app)-Layout fängt Customers ab).
 * - Keine Profil-Query auf der Startseite (verhindert "Lädt…" Hänger).
 */
export default function Home() {
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    let alive = true;

    async function boot() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!alive) return;
      if (session) {
        // Optimistischer Redirect: Agenten landen direkt korrekt,
        // Customers werden im (app)-Layout zu /customer umgeleitet.
        router.replace("/leads");
      } else {
        setShowAuth(true);
      }
    }

    void boot();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!alive) return;
      if (session) router.replace("/leads");
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (!showAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Lädt …
      </div>
    );
  }

  return <Auth supabaseClient={supabase} />;
}
