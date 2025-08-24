"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import AppSidebar from "@/components/app-sidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <div className="md:grid md:grid-cols-[16rem_1fr] min-h-svh">
        {/* Sidebar in Suspense (wegen usePathname) */}
        <Suspense fallback={<SidebarFallback />}>
          <AppSidebar />
        </Suspense>

        {/* Hauptbereich */}
        <main className="p-4">{children}</main>
      </div>
    </AuthGate>
  );
}

/**
 * AuthGate
 * - Rendert Kinder nur, wenn eine gültige Supabase-Session existiert.
 * - Ohne Session → Redirect auf "/" (Login).
 * - Reagiert live auf Login/Logout via onAuthStateChange.
 */
function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;

    // Initial prüfen
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (data.session) {
        setChecked(true);
      } else {
        setChecked(false);
        router.replace("/"); // keine Session → Loginseite
      }
    });

    // Live auf Login/Logout reagieren
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      if (session) {
        setChecked(true);
      } else {
        setChecked(false);
        router.replace("/");
      }
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (!checked) {
    // Kleiner Platzhalter, bis Session geprüft ist / Redirect passiert
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Anmeldung erforderlich …
      </div>
    );
  }

  return <>{children}</>;
}

function SidebarFallback() {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-card md:px-4 md:py-6">
      <div className="space-y-3">
        <div className="h-6 w-32 rounded bg-muted animate-pulse" />
        <div className="h-8 w-full rounded bg-muted animate-pulse" />
        <div className="h-8 w-5/6 rounded bg-muted animate-pulse" />
        <div className="h-8 w-2/3 rounded bg-muted animate-pulse" />
      </div>
    </aside>
  );
}


import './globals.css'

export const metadata = {
      generator: 'v0.app'
    };
