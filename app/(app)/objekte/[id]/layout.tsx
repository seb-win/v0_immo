'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';


export default function ObjektLayout({ children, params }: { children: ReactNode; params: { id: string } }) {
const pathname = usePathname();
const base = `/objekte/${params.id}`;


const tabs = [
{ href: base, label: 'Details' },
{ href: `${base}/dokumente`, label: 'Dokumente' },
{ href: `${base}/objektaufnahme`, label: 'Objektaufnahme' },
{ href: `${base}/bilder`, label: 'Bilder' },
];


return (
<div className="p-4 space-y-4">
<div className="flex flex-col gap-2">
<h1 className="text-2xl font-semibold">Objekt</h1>
<nav className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
{tabs.map((t) => {
const active = pathname === t.href;
return (
<Link
key={t.href}
href={t.href}
className={`px-3 py-1.5 text-sm rounded-md ${
active ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'hover:bg-gray-100 dark:hover:bg-gray-900'
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
