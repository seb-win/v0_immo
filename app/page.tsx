"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Auth from "@/components/auth";
import { Loader2 } from "lucide-react";

/**
 * Startseite (Login):
 * - Prüft Session.
 * - Bei Session -> Rolle prüfen:
 *    - agent    → /leads
 *    - customer → /objekte
 * - Falls keine Rolle oder Fehler -> Logout + zurück ins Login.
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
        // Rolle abfragen
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error || !profile) {
          console.warn("Fehler beim Laden des Profils – melde ab.");
          await supabase.auth.signOut();
          setShowAuth(true);
          return;
        }

        if (profile.role === "agent") router.replace("/leads");
        else if (profile.role === "customer") router.replace("/objekte");
        else {
          console.warn("Unbekannte Rolle – melde ab.");
          await supabase.auth.signOut();
          setShowAuth(true);
        }
      } else {
        setShowAuth(true);
      }
    }

    void boot();

    // Session-Änderungen live beobachten
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_evt, session) => {
      if (!alive) return;
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile?.role === "agent") router.replace("/leads");
        else if (profile?.role === "customer") router.replace("/objekte");
        else {
          console.warn("Keine Rolle gefunden – melde ab.");
          await supabase.auth.signOut();
          router.replace("/"); // zurück ins Login
        }
      }
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
