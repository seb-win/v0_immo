'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AppNav() {
  const pathname = usePathname();
  const item = (href: string, label: string) => {
    const active = pathname?.startsWith(href);
    return (
      <Link
        href={href}
        className={`px-3 py-2 rounded hover:bg-gray-100 ${active ? 'bg-gray-100 font-medium' : ''}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav className="w-full border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-2">
        <div className="font-semibold mr-4">RealtyVision</div>
        {item('/objekte', 'Objekte')}
        {/* weitere Menüpunkte später */}
      </div>
    </nav>
  );
}
