'use client';
import { useState } from 'react';

export function IntakeDevBar({ objectId }: { objectId: string }) {
  const [busy, setBusy] = useState(false);
  async function createDummy(variant?: 'wohn'|'haus') {
    setBusy(true);
    try {
      await fetch('/api/intake/dev/create-dummy', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ objectId, variant }) });
      location.reload();
    } finally { setBusy(false); }
  }
  async function seedOverrides(seed: boolean) {
    setBusy(true);
    try {
      await fetch('/api/intake/dev/overrides', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ objectId, seed }) });
      location.reload();
    } finally { setBusy(false); }
  }
  if (process.env.NODE_ENV === 'production') return null;
  return (
    <div className="rounded-lg border p-3 text-sm bg-yellow-50/60 flex items-center gap-2 flex-wrap">
      <span className="font-medium">DEV:</span>
      <button className="border rounded px-2 py-1" onClick={()=>createDummy('wohn')} disabled={busy}>Dummy-Aufnahme (Wohnung)</button>
      <button className="border rounded px-2 py-1" onClick={()=>createDummy('haus')} disabled={busy}>Dummy-Aufnahme (Haus)</button>
      <button className="border rounded px-2 py-1" onClick={()=>seedOverrides(true)} disabled={busy}>Overrides seed</button>
      <button className="border rounded px-2 py-1" onClick={()=>seedOverrides(false)} disabled={busy}>Overrides reset</button>
    </div>
  );
}
