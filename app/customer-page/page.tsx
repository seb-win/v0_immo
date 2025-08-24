"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import CustomerPage from "@/components/customer-page";
import { Loader2 } from "lucide-react";

/**
 * Customer-Home: simple Gate + Übergabe des Namens aus dem Profil.
 */
export default function CustomerHome() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function boot() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        router.replace("/");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", session.user.id)
        .single();

      if (!alive) return;

      if (profile?.role === "customer") {
        setFullName(profile.full_name ?? null);
        setReady(true);
      } else if (profile?.role === "agent") {
        router.replace("/leads");
      } else {
        await supabase.auth.signOut();
        router.replace("/");
      }
    }

    void boot();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!alive) return;
      if (!session) router.replace("/");
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

  return <CustomerPage fullName={fullName} />;
}
