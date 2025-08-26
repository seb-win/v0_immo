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
    let watchdog: ReturnType<typeof setTimeout> | null = null;

    async function boot() {
      try {
        const { data: sessData } = await supabase.auth.getSession();
        const session = sessData.session;

        if (!session) {
          if (alive) setReady(true);
          return;
        }

        // Watchdog: falls Profile-Query hängt
        watchdog = setTimeout(async () => {
          if (!alive) return;
          console.warn("[HOME] watchdog fired → signOut fallback");
          await supabase.auth.signOut();
          setReady(true);
        }, 6000);

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (watchdog) clearTimeout(watchdog);

        if (error) throw error;

        if (profile?.role === "agent") return router.replace("/leads");
        if (profile?.role === "customer") return router.replace("/customer");

        await supabase.auth.signOut();
        if (alive) setReady(true);
      } catch (e) {
        console.warn("[HOME] boot error:", e);
        await supabase.auth.signOut();
        if (alive) setReady(true);
      }
    }

    void boot();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_evt, session) => {
      if (!alive) return;
      if (!session) {
        setReady(true);
        return;
      }
      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();
        if (error) throw error;
        if (profile?.role === "agent") router.replace("/leads");
        else if (profile?.role === "customer") router.replace("/customer");
        else {
          await supabase.auth.signOut();
          setReady(true);
        }
      } catch (e) {
        console.warn("[HOME] onAuthStateChange error:", e);
        await supabase.auth.signOut();
        setReady(true);
      }
    });

    return () => {
      alive = false;
      if (watchdog) clearTimeout(watchdog);
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
