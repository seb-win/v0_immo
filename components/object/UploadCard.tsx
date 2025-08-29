// components/object/UploadCard.tsx
'use client';
import React, { useState } from 'react';
import { IntakeRun } from './types';

interface UploadCardProps {
  objectId: string;
  onRunCreated: (run: IntakeRun) => void;
}

export function UploadCard({ objectId, onRunCreated }: UploadCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadViaXHR(f: File) {
    return new Promise<unknown>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `/api/intake/upload?objectId=${encodeURIComponent(objectId)}`;
      xhr.open('POST', url);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (err) {
            resolve({});
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Netzwerkfehler beim Upload'));
      const form = new FormData();
      form.append('file', f);
      xhr.send(form);
    });
  }

  async function handleFile(f: File) {
    setError(null);
    setFile(f);
    setBusy(true);
    setProgress(1);

    try {
      // Try real API (replace with your implementation); expects { run: IntakeRun }
      const res = (await uploadViaXHR(f)) as any;
      let run: IntakeRun | null = res?.run ?? null;
      if (!run) {
        // Fallback: create a local placeholder run
        run = {
          id: `run_${Math.random().toString(36).slice(2, 10)}`,
          filename: f.name,
          uploadedAt: new Date().toLocaleString(),
          status: 'uploaded',
        };
      }
      onRunCreated(run);
      // Simulierter Status-Flow (bis Backend fertig ist)
      setTimeout(() => onRunCreated({ ...run!, status: 'queued' }), 600);
      setTimeout(() => onRunCreated({ ...run!, status: 'processing' }), 1400);
      setTimeout(() => onRunCreated({ ...run!, status: 'succeeded', durationSec: 6 }), 2600);
    } catch (e: any) {
      setError(e?.message || 'Upload fehlgeschlagen');
      const run: IntakeRun = {
        id: `run_${Math.random().toString(36).slice(2, 10)}`,
        filename: f.name,
        uploadedAt: new Date().toLocaleString(),
        status: 'failed',
        errorText: 'Upload fehlgeschlagen',
      };
      onRunCreated(run);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border rounded-xl p-4">
      <h2 className="text-lg font-semibold">Interaktives PDF hochladen</h2>
      <p className="text-sm text-gray-600 mt-1">Nur interaktive PDFs (AcroForm), max. 10 MB. Nutze unsere Vorlage.</p>

      <div className="mt-4 flex items-center gap-3">
        <label className={`inline-flex items-center px-3 py-2 border rounded-md cursor-pointer ${busy ? 'opacity-60 pointer-events-none' : 'hover:bg-gray-50'}`}>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <span>Datei auswählen</span>
        </label>
        {file && <span className="text-sm text-gray-700 truncate max-w-[50ch]">{file.name}</span>}
      </div>

      {file && (
        <div className="mt-3">
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-2 bg-gray-900 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-xs text-gray-500 mt-1">Upload: {progress}%</div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
