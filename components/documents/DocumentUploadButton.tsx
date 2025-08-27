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
  onUploaded: () => void; // parent kann auch eine async-Funktion übergeben
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
      if (!uid) throw new Error('Nicht eingeloggt');

      const path = repo.buildStoragePath({
        bucket: 'documents',
        propertyId,
        documentTypeKey,
        propertyDocumentId,
        originalFilename: file.name,
      });

      const uploadRes = await supabase.storage
        .from('documents')
        .upload(path, file, { upsert: false });

      if (uploadRes.error) throw uploadRes.error;

      const meta = {
        filename: file.name,
        ext: file.name.split('.').pop(),
        mime_type: file.type,
        size: file.size,
        is_shared_with_customer: true,
      };

      const reg = await repo.registerUploadedFile(
        propertyDocumentId,
        meta,
        uid,
        path
      );
      if (!reg.ok) throw new Error(reg.error.message || 'register failed');

      // Parent benachrichtigen (darf async sein)
      onUploaded();
    } catch (e: any) {
      alert(`Upload fehlgeschlagen: ${e?.message ?? e}`);
    } finally {
      // Input resetten, damit dieselbe Datei erneut gewählt werden kann
      if (fileInput.current) fileInput.current.value = '';
      setBusy(false);
    }
  }

  return (
    <div>
      <input
        ref={fileInput}
        type="file"
        className="hidden"
        // optional: Dateitypen einschränken
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.gif,.txt,.rtf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
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
