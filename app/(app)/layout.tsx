// app/(app)/layout.tsx
import type { ReactNode } from "react";
import { Suspense } from "react";
import AppSidebar from "@/components/app-sidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="md:grid md:grid-cols-[16rem_1fr] min-h-svh">
      {/* Sidebar: innerhalb von Suspense, damit usePathname() keinen Warning auslöst */}
      <Suspense fallback={<SidebarFallback />}>
        <AppSidebar />
      </Suspense>

      {/* Hauptbereich */}
      <main className="p-4">{children}</main>
    </div>
  );
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
