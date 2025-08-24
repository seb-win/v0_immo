"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as defaultClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

type AuthProps = {
  /** Optional – wird bei dir bereits so verwendet: <Auth supabaseClient={supabase} /> */
  supabaseClient?: SupabaseClient;
  className?: string;
};

export default function Auth({ supabaseClient, className }: AuthProps) {
  const client = supabaseClient ?? defaultClient;

  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Beim Mount: Session prüfen – „keine Session“ ist KEIN Fehler.
  useEffect(() => {
    let alive = true;

    client.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      // Falls der SDK hier „Auth session missing“ liefert: ignorieren.
      if (error && !/session missing/i.test(error.message)) {
        // Nur echte Fehler zeigen
        setError(error.message);
      }
      setCheckingSession(false);
      // Falls bereits eingeloggt, kümmert sich deine Home-Seite/Layouts um Redirect.
    });

    // Live auf Login/Logout reagieren (kein UI-Fehler anzeigen)
    const { data: { subscription } } = client.auth.onAuthStateChange(() => {
      // Keine spezielle Aktion nötig: deine app/page.tsx erkennt den Login und leitet weiter.
      // Optional könnte man hier router.refresh() aufrufen, ist aber nicht erforderlich.
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [client]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        return;
      }
      // Erfolgreicher Login → onAuthStateChange triggert in deiner App den Redirect.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler beim Anmelden.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Lädt …
      </div>
    );
  }

  return (
    <div className={["flex min-h-screen items-center justify-center bg-background px-4", className].filter(Boolean).join(" ")}>
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Anmelden</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Melde dich mit deinen Zugangsdaten an.
        </p>

        {error && (
          <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">E-Mail</label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">Passwort</label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full gap-2" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Anmelden
          </Button>
        </form>

        {/* Optional: Magic Link / Social Logins später ergänzen */}
      </div>
    </div>
  );
}
