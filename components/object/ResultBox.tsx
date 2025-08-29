// components/object/ResultBox.tsx
'use client';
import React from 'react';
import { IntakeRun } from './types';

interface ResultBoxProps {
  latest: IntakeRun | null;
  objectId: string;
}

export function ResultBox({ latest, objectId }: ResultBoxProps) {
  if (!latest || latest.status !== 'succeeded') return null;
  return (
    <section className="border rounded-xl p-4">
      <h3 className="font-medium">Ergebnis (zuletzt erfolgreich)</h3>
      <p className="text-sm text-gray-600 mt-1">Schema v1 · Parser OK</p>
      {/* Platzhalter Felder – ersetze durch echte Daten */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
        <div className="border rounded-lg p-3"><div className="text-gray-500">Adresse</div><div>Musterstraße 12, Berlin</div></div>
        <div className="border rounded-lg p-3"><div className="text-gray-500">Wohnfläche</div><div>120 m²</div></div>
        <div className="border rounded-lg p-3"><div className="text-gray-500">Zimmer</div><div>4</div></div>
      </div>
      <div className="mt-4 flex gap-2">
        <a className="px-3 py-1.5 rounded-md bg-gray-900 text-white text-sm" href={`/objekte/${objectId}/objektaufnahme/${latest.id}/edit`}>
          Im Editor öffnen
        </a>
        <button className="px-3 py-1.5 rounded-md border text-sm">JSON downloaden</button>
      </div>
    </section>
  );
}
