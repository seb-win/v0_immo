'use client';

import { useEffect } from 'react';
import type { IntakeRunDto } from '@/lib/intake/types';

type Props = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  run: IntakeRunDto | null;
};

/**
 * Minimalistischer, robuster Drawer für Verarbeitungs-Details.
 * - Rendert niemals rohe Objekte als React-Child (immer String/JSON).
 * - Hält leere/null-Werte aus.
 * - Kann leicht ausgebaut werden (TODO-Abschnitte).
 */
export function RunDetailsDrawer({ open, onOpenChange, run }: Props) {
  // ESC schließt
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  // Defensive: wenn kein Run übergeben ist, zeig’ freundliche Meldung
  const safeRun = run ?? null;

  // kleine Helfer
  const fmt = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
  };

  const statusChip = (s?: string) => {
    const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs';
    switch (s) {
      case 'succeeded': return <span className={`${base} bg-green-100 text-green-700`}>succeeded</span>;
      case 'failed':    return <span className={`${base} bg-red-100 text-red-700`}>failed</span>;
      case 'processing':return <span className={`${base} bg-yellow-100 text-yellow-800`}>processing</span>;
      case 'queued':    return <span className={`${base} bg-gray-100 text-gray-700`}>queued</span>;
      default:          return <span className={`${base} bg-gray-100 text-gray-700`}>{s ?? '—'}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />

      {/* Drawer Panel (rechts) */}
      <div
        className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-xl flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <div className="text-sm text-gray-500">Verarbeitung</div>
            <div className="text-base font-semibold">
              {safeRun ? (safeRun.filename || 'upload.pdf') : 'Keine Auswahl'}
            </div>
          </div>
          <button
            className="text-sm underline underline-offset-4"
            onClick={() => onOpenChange(false)}
          >
            Schließen
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {!safeRun ? (
            <div className="rounded-md border p-3 text-sm text-gray-600">
              Es ist keine Verarbeitung ausgewählt.
            </div>
          ) : (
            <>
              {/* Meta */}
              <div className="rounded-md border p-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Status</div>
                    <div>{statusChip(safeRun.status)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Hochgeladen</div>
                    <div>{fmt(safeRun.uploadedAt)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Run-ID</div>
                    <div className="font-mono text-xs break-all">{safeRun.id}</div>
                  </div>
                  {/* Platz für mehr Meta (z. B. Job-ID, Dauer etc.), sobald verfügbar */}
                </div>
              </div>

              {/* TODO: Ergebnis / Rohdaten */}
              {/* Wenn du hier später JSON aus einer API zeigst:
                  IMMER stringifizieren, nie Objekte direkt rendern! */}
              {/* <div className="rounded-md border p-3">
                <div className="text-sm font-medium mb-2">Rohdaten (Ausschnitt)</div>
                <pre className="text-xs whitespace-pre-wrap break-words">
                  {JSON.stringify(resultSnippet, null, 2)}
                </pre>
              </div> */}

              {/* TODO: Audit / Webhook-Events */}
              {/* <div className="rounded-md border p-3">
                <div className="text-sm font-medium mb-2">Audit</div>
                <pre className="text-xs whitespace-pre-wrap break-words">
                  {JSON.stringify(auditSnippet, null, 2)}
                </pre>
              </div> */}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default RunDetailsDrawer;
