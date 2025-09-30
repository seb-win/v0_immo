'use client';

import { useState } from 'react';
import type { IntakeRunDto } from '@/lib/intake/types';

type Props = {
  objectId: string;
  runs: IntakeRunDto[];
  onOpenDetails?: (id: string) => void;
  onSourceChanged?: () => void;
};

function formatDe(dateIso: string | null | undefined) {
  if (!dateIso) return '—';
  const d = new Date(dateIso);
  // dd.mm.yyyy hh:mm
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

export function RunsTable({ objectId, runs, onOpenDetails, onSourceChanged }: Props) {
  const [posting, setPosting] = useState<string | null>(null); // runId gerade als Quelle setzen

  async function setAsSource(runId: string) {
    try {
      setPosting(runId);
      const res = await fetch(`/api/objects/${objectId}/intake-source`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intakeId: runId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || 'Fehler beim Setzen der Quelle');
      }
      // Event an Parent/andere Komponenten
      onSourceChanged?.();
    } catch (e) {
      // optional: toast
      console.error(e);
    } finally {
      setPosting(null);
    }
  }

  if (!runs?.length) {
    return (
      <div className="rounded-lg border p-4 text-sm text-gray-600">
        Noch keine Aufnahmen. Lade ein PDF hoch, um zu starten.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/40">
            <tr>
              <th className="text-left px-3 py-2">Hochgeladen</th>
              <th className="text-left px-3 py-2">Datei</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">{formatDe(r.uploadedAt)}</td>
                <td className="px-3 py-2">{r.filename || 'upload.pdf'}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                      r.status === 'succeeded'
                        ? 'bg-green-100 text-green-700'
                        : r.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : r.status === 'processing'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {r.status === 'succeeded' && (
                      <button
                        className={`rounded-md border px-2 py-1 text-xs ${
                          posting === r.id ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                        onClick={() => setAsSource(r.id)}
                        disabled={posting === r.id}
                        title="Diese Aufnahme als aktive Quelle setzen"
                      >
                        {posting === r.id ? 'Setze …' : 'Als Quelle setzen'}
                      </button>
                    )}
                    {onOpenDetails && (
                      <button
                        className="rounded-md border px-2 py-1 text-xs"
                        onClick={() => onOpenDetails(r.id)}
                        title="Details anzeigen"
                      >
                        Details
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
