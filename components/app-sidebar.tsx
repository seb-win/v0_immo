"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Home, Building, FileText, LogOut } from "lucide-react";

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;
type Role = "agent" | "customer";

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: IconType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm outline-none
        ${
          active
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }
        focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}

export default function AppSidebar() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null); // <— NEU

  // Session + Rolle laden/aktualisieren
  useEffect(() => {
    let alive = true;

    async function load() {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      const session = data.session;
      setEmail(session?.user?.email ?? null);

      if (session?.user?.id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();
        if (!alive) return;
        if (prof?.role === "agent" || prof?.role === "customer") {
          setRole(prof.role as Role);
        } else {
          setRole(null);
        }
      } else {
        setRole(null);
      }
    }

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!alive) return;
      setEmail(session?.user?.email ?? null);
      if (!session?.user?.id) {
        setRole(null);
      } else {
        // Rolle später nochmal geladen – kein extra Call hier nötig
      }
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const isAgent = role === "agent";
  const isCustomer = role === "customer";

  return (
    <aside
      className="hidden md:sticky md:top-0 md:flex md:h-svh md:w-64 md:flex-col md:border-r md:bg-card md:px-4 md:py-6"
      aria-label="Hauptnavigation"
    >
      <div className="flex h-full flex-col justify-between">
        {/* Brand + Nav */}
        <div>
          <div className="flex items-center gap-2 px-2">
            <Building className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Makler-OS</h1>
          </div>

          <nav className="mt-8 flex flex-col gap-1">
            {/* Leads nur für Agents */}
            {isAgent && (
              <NavLink
                href="/leads"
                label="Leads"
                icon={Home}
                active={isActivePath(pathname ?? "", "/leads")}
              />
            )}

            {/* Objekte für beide Rollen */}
            <NavLink
              href="/objekte"
              label="Objekte"
              icon={Building}
              active={isActivePath(pathname ?? "", "/objekte")}
            />

            {/* Top-Level „Dokumente“ entfernen ODER auf /objekte verlinken */}
            {/* Variante: auskommentiert/entfernt
            <NavLink
              href="/dokumente"
              label="Dokumente"
              icon={FileText}
              active={isActivePath(pathname ?? "", "/dokumente")}
            />
            */}
            {/* Optionale Ersatz-Variante: */}
            {/* <NavLink
              href="/objekte"
              label="Dokumente (über Objekt)"
              icon={FileText}
              active={isActivePath(pathname ?? "", "/objekte")}
            /> */}
          </nav>
        </div>

        {/* Footer */}
        <div>
          <div className="my-4 h-px bg-border" />
          <div className="flex flex-col gap-2">
            <div className="px-2 text-xs text-muted-foreground truncate">
              Eingeloggt als: {email ?? "—"}
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
