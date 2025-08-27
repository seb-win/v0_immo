'use client';

import type { DocumentFile } from '@/lib/repositories/contracts';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useMemo } from 'react';
import { createDocumentsRepo } from '@/lib/repositories/documents-repo';

export default function DocumentFileList({
  files,
  onView,
  onDeleted,
  onToggleShare,
  isAgent,
}: {
  files: DocumentFile[];
  onView: (file: DocumentFile) => void;
  onDeleted: () => void;
  onToggleShare: () => void;
  isAgent: boolean;
}) {
  const repo = useMemo(() => createDocumentsRepo(supabaseBrowser()), []);

  async function handleDelete(id: string) {
    const r = await repo.deleteFile(id);
    if (!r.ok) return alert(r.error.message || 'Delete fehlgeschlagen');
    onDeleted();
  }

  async function handleToggle(file: DocumentFile) {
    const r = await repo.toggleShareWithCustomer(file.id, !file.is_shared_with_customer);
    if (!r.ok) return alert(r.error.message || 'Update fehlgeschlagen');
    onToggleShare();
  }

  return (
    <div className="border rounded-lg">
      <div className="p-3 border-b bg-gray-50 font-medium">Dateien</div>
      <ul className="divide-y max-h-[50vh] overflow-auto">
        {files.map(f => (
          <li key={f.id} className="p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{f.filename}</div>
              <div className="text-xs text-gray-500">{f.mime_type ?? f.ext ?? ''} · {formatBytes(f.size ?? 0)}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button className="text-sm px-2 py-1 border rounded" onClick={() => onView(f)}>Ansehen</button>
              {isAgent && (
                <button className="text-sm px-2 py-1 border rounded" onClick={() => handleToggle(f)}>
                  {f.is_shared_with_customer ? 'Verbergen' : 'Teilen'}
                </button>
              )}
              {isAgent && (
                <button className="text-sm px-2 py-1 border rounded" onClick={() => handleDelete(f.id)}>Löschen</button>
              )}
            </div>
          </li>
        ))}
        {files.length === 0 && (
          <li className="p-3 text-sm text-gray-500">Noch keine Dateien.</li>
        )}
      </ul>
    </div>
  );
}

function formatBytes(b: number) {
  if (!b) return '0 B';
  const u = ['B','KB','MB','GB'];
  const i = Math.min(u.length - 1, Math.floor(Math.log(b)/Math.log(1024)));
  return `${(b/Math.pow(1024,i)).toFixed(1)} ${u[i]}`;
}
