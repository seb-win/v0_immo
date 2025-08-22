"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Home, Building, FileText, LogOut } from "lucide-react";

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

function isActivePath(pathname: string, href: string) {
  // Aktiv, wenn exakt auf der Route oder in einer Unterroute (z. B. /leads/123)
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
        ${active
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    // Sichtbar ab md-Breakpoint
    <aside className="hidden md:sticky md:top-0 md:flex md:h-svh md:w-64 md:flex-col md:border-r md:bg-card md:px-4 md:py-6">
      <div className="flex h-full flex-col justify-between">
        {/* Brand + Nav */}
        <div>
          <div className="flex items-center gap-2 px-2">
            <Building className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Makler-OS</h1>
          </div>

          <nav className="mt-8 flex flex-col gap-1">
            {/* PRIMARY: Leads */}
            <NavLink
              href="/leads"
              label="Leads"
              icon={Home}
              active={isActivePath(pathname ?? "", "/leads")}
            />

            {/* Weitere Einträge */}
            <NavLink
              href="/objekte"
              label="Objekte"
              icon={Building}
              active={isActivePath(pathname ?? "", "/objekte")}
            />
            <NavLink
              href="/dokumente"
              label="Dokumente"
              icon={FileText}
              active={isActivePath(pathname ?? "", "/dokumente")}
            />
          </nav>
        </div>

        {/* Footer (fix am unteren Rand) */}
        <div>
          <div className="my-4 h-px bg-border" />
          <div className="flex flex-col gap-2">
            <div className="px-2 text-xs text-muted-foreground truncate">
              Eingeloggt als: {email ?? "Lade…"}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
