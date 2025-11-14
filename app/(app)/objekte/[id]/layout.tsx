'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

export default function ObjektLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { id: string };
}) {
  const pathname = usePathname();
  const base = `/objekte/${params.id}`;

  const tabs = [
    { href: base, label: 'Details', match: (p: string) => p === base },
    { href: `${base}/objektdaten`, label: 'Objektdaten', match: (p: string) => p.startsWith(`${base}/objektdaten`) },
    { href: `${base}/objektaufnahme`, label: 'Objektaufnahme', match: (p: string) => p.startsWith(`${base}/objektaufnahme`) },
    { href: `${base}/dokumente`, label: 'Dokumente', match: (p: string) => p.startsWith(`${base}/dokumente`) },
    { href: `${base}/bilder`, label: 'Bilder', match: (p: string) => p.startsWith(`${base}/bilder`) },
    { href: `${base}/demodaten`, label: 'Demodaten', match: (p: string) => p.startsWith(`${base}/demodaten`) },
  ];

  return (
    // ⬇️ p-4 entfernt – nur noch vertikaler Abstand
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Objekt</h1>
        <nav className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
          {tabs.map((t) => {
            const active = t.match(pathname);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`px-3 py-1.5 text-sm rounded-md ${
                  active
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-black'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-900'
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div>{children}</div>
    </div>
  );
}
