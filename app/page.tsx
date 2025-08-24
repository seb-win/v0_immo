"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Auth from "@/components/auth";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    async function boot() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (session) {
        // Rolle abfragen und passend weiterleiten
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (profile?.role === "agent") {
          router.replace("/leads");
        } else if (profile?.role === "customer") {
          router.replace("/customer");
        } else {
          // unbekannte Rolle -> zurück zum Login (oder Signout)
          await supabase.auth.signOut();
          setReady(true);
        }
      } else {
        setReady(true);
      }
    }

    void boot();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_evt, session) => {
      if (!alive) return;
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (profile?.role === "agent") {
          router.replace("/leads");
        } else if (profile?.role === "customer") {
          router.replace("/customer");
        } else {
          await supabase.auth.signOut();
          setReady(true);
        }
      }
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Lädt …
      </div>
    );
  }

  return <Auth supabaseClient={supabase} />;
}
