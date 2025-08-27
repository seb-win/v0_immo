'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DocumentFile } from '@/lib/repositories/contracts';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function DocumentViewer({ file }: { file: DocumentFile | null }) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!file) { setUrl(null); return; }
      const { data, error } = await supabase.storage.from('documents').createSignedUrl(file.storage_path, 60);
      if (!cancelled) setUrl(error ? null : data?.signedUrl ?? null);
    }
    run();
    return () => { cancelled = true; };
  }, [file]);

  if (!file) return <div className="border rounded-lg p-4 text-gray-500">Keine Datei ausgewählt.</div>;
  if (!url) return <div className="border rounded-lg p-4">Vorschau wird geladen…</div>;

  const ext = (file.ext || '').toLowerCase();
  const isImage = ['jpg','jpeg','png','webp','gif'].includes(ext);
  const isPdf = ext === 'pdf';

  return (
    <div className="border rounded-lg p-2">
      {isPdf && (
        <object data={url} type="application/pdf" className="w-full h-[60vh] rounded"></object>
      )}
      {isImage && (
        <img src={url} alt={file.filename} className="max-h-[60vh] w-auto object-contain mx-auto" />
      )}
      {!isPdf && !isImage && (
        <div className="p-4 text-sm">
          <div>Keine Inline‑Vorschau verfügbar.</div>
          <a href={url} target="_blank" className="text-blue-600 underline">Datei herunterladen</a>
        </div>
      )}
    </div>
  );
}
