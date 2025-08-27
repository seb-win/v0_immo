'use client';

import { useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { createDocumentsRepo } from '@/lib/repositories/documents-repo';

export default function DocumentUploadButton({
  propertyId,
  propertyDocumentId,
  documentTypeKey,
  onUploaded,
}: {
  propertyId: string;
  propertyDocumentId: string;
  documentTypeKey: string;
  onUploaded: () => void;
}) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const repo = useMemo(() => createDocumentsRepo(supabase), [supabase]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const user = await supabase.auth.getUser();
      const uid = user.data.user?.id as string;

      const path = repo.buildStoragePath({
        bucket: 'documents',
        propertyId,
        documentTypeKey,
        propertyDocumentId,
        originalFilename: file.name,
      });

      const uploadRes = await supabase.storage.from('documents').upload(path, file, { upsert: false });
      if (uploadRes.error) throw uploadRes.error;

      const meta = { filename: file.name, ext: file.name.split('.').pop(), mime_type: file.type, size: file.size, is_shared_with_customer: true };
      const reg = await repo.registerUploadedFile(propertyDocumentId, meta, uid, path);
      if (!reg.ok) throw new Error(reg.error.message || 'register failed');

      onUploaded();
    } catch (e: any) {
      alert(`Upload fehlgeschlagen: ${e.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <input ref={fileInput} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      <button
        className="px-3 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
        onClick={() => fileInput.current?.click()}
        disabled={busy}
      >
        {busy ? 'Lade hoch…' : 'Datei hochladen'}
      </button>
    </div>
  );
}
