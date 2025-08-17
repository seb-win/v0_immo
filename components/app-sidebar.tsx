"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Home, Building, FileText, LogOut } from "lucide-react";

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm
        ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
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
    supabase?.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const handleSignOut = async () => {
    await supabase?.auth.signOut();
    window.location.href = "/";
  };

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-card md:px-4 md:py-6">
      {/* Brand */}
      <div className="flex items-center gap-2 px-2">
        <Building className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold">Makler-OS</h1>
      </div>

      {/* Nav */}
      <nav className="mt-8 flex flex-col gap-1">
        <NavLink href="/leads" label="Leads" icon={Home} active={pathname?.startsWith("/leads") ?? false} />
        <NavLink href="/objekte" label="Objekte" icon={Building} active={pathname?.startsWith("/objekte") ?? false} />
        <NavLink href="/dokumente" label="Dokumente" icon={FileText} active={pathname?.startsWith("/dokumente") ?? false} />
      </nav>

      {/* Footer (logout) */}
      <div className="mt-auto">
        <div className="my-4 h-px bg-border" />
        <div className="px-2 py-2 text-xs text-muted-foreground">
          Eingeloggt: {email ?? "Lade…"}
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
