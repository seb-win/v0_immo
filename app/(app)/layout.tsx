"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import AppSidebar from "@/components/app-sidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthRoleGate>
      <div className="md:grid md:grid-cols-[16rem_1fr] min-h-svh">
        <Suspense fallback={<SidebarFallback />}>
          <AppSidebar />
        </Suspense>
        <main className="p-4">{children}</main>
      </div>
    </AuthRoleGate>
  );
}

function AuthRoleGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "allowed" | "redirecting">("checking");

  useEffect(() => {
    let alive = true;

    async function check() {
      try {
        const { data: sessData } = await supabase.auth.getSession();
        const session = sessData.session;
        if (!session) {
          if (!alive) return;
          setState("redirecting");
          router.replace("/");
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) throw error;

        if (profile?.role === "agent") {
          if (alive) setState("allowed");
          return;
        }
        if (profile?.role === "customer") {
          if (!alive) return;
          setState("redirecting");
          router.replace("/customer");
          return;
        }

        // Unbekannte Rolle
        await supabase.auth.signOut();
        if (!alive) return;
        setState("redirecting");
        router.replace("/");
      } catch (e) {
        console.warn("[(app)/layout] role check error:", e);
        await supabase.auth.signOut();
        if (!alive) return;
        setState("redirecting");
        router.replace("/");
      }
    }

    void check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!alive) return;
      if (!session) {
        setState("redirecting");
        router.replace("/");
      }
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (state === "checking") {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Zugang prüfen …
      </div>
    );
  }

  if (state === "redirecting") {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Weiterleitung …
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
