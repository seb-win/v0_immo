"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Auth from "@/components/auth";
import CustomerPage from "@/components/customer-page";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasRedirectedRef = useRef(false);
  const signingOutRef = useRef(false);

  const debug = (message: string) => {
    // eslint-disable-next-line no-console
    console.log(`[DEBUG] ${message}`);
  };

  useEffect(() => {
    debug("App mounted, initializing Supabase");
    initializeSupabase();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      debug(`Auth event: ${event}`);
      const newUser = session?.user ?? null;
      setUser(newUser);

      if (newUser) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("role, full_name")
            .eq("id", newUser.id)
            .single();

          if (profileError) {
            debug(`Auth change profile fetch error: ${profileError.message}`);
            setRole(null);
            setFullName(null);
          } else {
            setRole(profileData?.role ?? null);
            setFullName(profileData?.full_name ?? null);
          }
        } catch {
          debug("Unexpected error fetching profile on auth change");
          setRole(null);
          setFullName(null);
        }
      } else {
        // Fully reset state on logout
        setUser(null);
        setRole(null);
        setFullName(null);
        hasRedirectedRef.current = false;
      }
    });

    return () => {
      debug("Cleaning up auth subscription");
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect für Agents → /leads
  useEffect(() => {
    if (!user || !role) return;
    if (role === "agent" && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      router.replace("/leads");
    }
  }, [user, role, router]);

  // 🛡️ Fallback: User eingeloggt aber Rolle unbekannt → sofort ausloggen & Auth zeigen
  useEffect(() => {
    if (loading) return;
    if (!user) return;
    const known = role === "agent" || role === "customer";
    if (!known && !signingOutRef.current) {
      signingOutRef.current = true;
      debug("Unknown role → signing out to show Auth");
      supabase.auth.signOut().finally(() => {
        setUser(null);
        setRole(null);
        setFullName(null);
        hasRedirectedRef.current = false;
        signingOutRef.current = false;
      });
    }
  }, [user, role, loading]);

  const initializeSupabase = async () => {
    setError(null);

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(`Authentication error: ${sessionError.message}`);

      const currentUser = data.session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", currentUser.id)
          .single();

        if (profileError) throw new Error(`Profile fetch error: ${profileError.message}`);

        setRole(profileData?.role ?? null);
        setFullName(profileData?.full_name ?? null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      debug(`Init error: ${errorMessage}`);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    debug("Manual retry");
    setUser(null);
    setRole(null);
    setFullName(null);
    setLoading(true);
    setError(null);
    hasRedirectedRef.current = false;
    initializeSupabase();
  };

  // === Render ===

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
          <div className="mb-4 flex items-center gap-2 text-red-600">
            <AlertCircle className="h-6 w-6" />
            <h2 className="text-xl font-semibold">Connection Error</h2>
          </div>
          <p className="mb-4 text-gray-700">{error}</p>
          <Button onClick={handleRetry} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Session wird geprüft
  if (loading && !user) return null;

  // Nicht eingeloggt → Auth
  if (!user) return <Auth supabaseClient={supabase} />;

  // Eingeloggt + Rolle "agent": Redirect läuft (siehe useEffect) → kleinen Loader anzeigen
  if (role === "agent") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Weiterleitung zu deinen Leads …</p>
      </div>
    );
  }

  // Kunde → eigene Seite
  if (role === "customer") return <CustomerPage fullName={fullName} />;

  // Eingeloggt aber Rolle unbekannt → wir stoßen gerade signOut an; zeige Auth-UI
  return <Auth supabaseClient={supabase} />;
}
