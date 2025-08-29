// components/object/RunsTable.tsx
'use client';
import React from 'react';
import { IntakeRun } from './types';
import { StatusBadge } from './StatusBadge';

interface RunsTableProps {
  runs: IntakeRun[];
  onOpenDetails?: (runId: string) => void;
  editorHrefFor?: (runId: string) => string | null;
}

export function RunsTable({ runs, onOpenDetails, editorHrefFor }: RunsTableProps) {
  return (
    <section className="border rounded-xl p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Verarbeitungen</h3>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="py-2 pr-3">Datei</th>
              <th className="py-2 pr-3">Uploadzeit</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Dauer</th>
              <th className="py-2 pr-3">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-2 pr-3">{r.filename}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{r.uploadedAt}</td>
                <td className="py-2 pr-3"><StatusBadge status={r.status} /></td>
                <td className="py-2 pr-3">{r.durationSec ? `${r.durationSec}s` : '–'}</td>
                <td className="py-2 pr-3 flex gap-2">
                  {onOpenDetails && (
                    <button className="text-xs underline" onClick={() => onOpenDetails(r.id)}>Details</button>
                  )}
                  {editorHrefFor && r.status === 'succeeded' ? (
                    <a className="text-xs underline" href={editorHrefFor(r.id) ?? '#'}>Im Editor öffnen</a>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
