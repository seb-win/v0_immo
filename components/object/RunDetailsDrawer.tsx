// components/object/RunDetailsDrawer.tsx
'use client';
import React from 'react';
import { IntakeRun, statusLabel } from './types';

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: IntakeRun | null;
}

export function RunDetailsDrawer({ open, onOpenChange, run }: DrawerProps) {
  if (!open || !run) return null;
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={() => onOpenChange(false)} />
      <aside className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-white dark:bg-black p-4 shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Details: {run.filename}</h3>
          <button className="text-sm underline" onClick={() => onOpenChange(false)}>Schließen</button>
        </div>
        <div className="mt-4 space-y-3 text-sm">
          <div><span className="text-gray-500">Uploadzeit:</span> {run.uploadedAt}</div>
          <div><span className="text-gray-500">Status:</span> {statusLabel[run.status]}</div>
          {run.durationSec != null && <div><span className="text-gray-500">Dauer:</span> {run.durationSec}s</div>}
          {run.errorText && <div className="text-red-600">Fehler: {run.errorText}</div>}
        </div>
        <div className="mt-6">
          <h4 className="font-medium">Webhook-Timeline</h4>
          <ul className="mt-2 space-y-2 text-sm text-gray-600">
            <li>• Job angelegt</li>
            <li>• An Parser gesendet</li>
            <li>• Ergebnis empfangen</li>
          </ul>
        </div>
        <div className="mt-6">
          <h4 className="font-medium">Ergebnis (JSON)</h4>
          <pre className="mt-2 p-2 bg-gray-50 rounded-md text-xs overflow-auto">{{/* Platzhalter – fülle per Fetch */}}</pre>
        </div>
      </aside>
    </div>
  );
}
