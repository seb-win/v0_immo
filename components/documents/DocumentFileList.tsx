'use client';

import { useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { createDocumentsRepo } from '@/lib/repositories/documents-repo';
import type { DocumentFile } from '@/lib/repositories/contracts';

type Props = {
  files: DocumentFile[];
  isAgent: boolean;
  onView: (file: DocumentFile) => void;
  onDeleted: () => void | Promise<void>;
  onToggleShare: () => void | Promise<void>;
};

export default function DocumentFileList({
  files,
  isAgent,
  onView,
  onDeleted,
  onToggleShare,
}: Props) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const repo = useMemo(() => createDocumentsRepo(supabase), [supabase]);

  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleToggleShare(file: DocumentFile) {
    if (!isAgent) return;
    setBusyId(file.id);
    try {
      const next = !file.is_shared_with_customer;
      const res = await repo.toggleShareWithCustomer(file.id, next);
      if (!res.ok) throw new Error(res.error.message || 'Toggle fehlgeschlagen');
      await onToggleShare();
    } catch (e: any) {
      alert(`Freigabe umschalten fehlgeschlagen: ${e?.message ?? e}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(file: DocumentFile) {
    if (!isAgent) return;
    if (!confirm(`Datei „${file.filename}“ wirklich löschen?`)) return;

    setBusyId(file.id);
    try {
      // 1) STORAGE: Datei im Bucket entfernen (relativer Pfad)
      //    Hinweis: Policies erlauben Agenten das Löschen im Bucket „documents“.
      const { error: storageErr } = await supabase.storage
        .from('documents')
        .remove([file.storage_path]);

      // 2) DB: Eintrag in document_files entfernen – auch wenn Storage schon weg war/fehlgeschlagen ist
      const res = await repo.deleteFile(file.id);
      if (!res.ok) {
        // Falls DB-Delete fehlschlägt, aber Storage geklappt hat, bleibt „Waisen-DB“-Schutz aus:
        // → Wir zeigen den Fehler an, damit man notfalls manuell nachfasst.
        throw new Error(res.error.message || 'DB-Löschung fehlgeschlagen');
      }

      // Optionaler Hinweis, falls nur Storage-Teil scheiterte (z. B. 404)
      if (storageErr) {
        console.warn('Storage-Delete hatte einen Fehler, DB-Delete jedoch erfolgreich:', storageErr);
      }

      await onDeleted();
    } catch (e: any) {
      alert(`Löschen fehlgeschlagen: ${e?.message ?? e}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="border rounded-lg">
      <div className="px-3 py-2 border-b text-sm font-medium">Dateien</div>

      <ul className="divide-y">
        {files.map((f) => {
          const isBusy = busyId === f.id;
          return (
            <li key={f.id} className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{f.filename}</div>
                <div className="text-xs text-gray-500">
                  {formatBytes(f.size)} · {formatDateTime(f.created_at)} · {f.mime_type || '—'}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Ansehen */}
                <button
                  className="px-2 py-1 text-sm border rounded hover:bg-gray-50"
                  onClick={() => onView(f)}
                  disabled={isBusy}
                >
                  Ansehen
                </button>

                {/* Freigabe (nur Agent) */}
                {isAgent && (
                  <button
                    className="px-2 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
                    onClick={() => handleToggleShare(f)}
                    disabled={isBusy}
                    title={f.is_shared_with_customer ? 'Für Kunden freigegeben' : 'Für Kunden versteckt'}
                  >
                    {f.is_shared_with_customer ? 'Freigabe: an' : 'Freigabe: aus'}
                  </button>
                )}

                {/* Löschen (nur Agent) */}
                {isAgent && (
                  <button
                    className="px-2 py-1 text-sm border rounded hover:bg-red-50 border-red-300 text-red-700 disabled:opacity-50"
                    onClick={() => handleDelete(f)}
                    disabled={isBusy}
                  >
                    {isBusy ? 'Lösche…' : 'Löschen'}
                  </button>
                )}
              </div>
            </li>
          );
        })}

        {files.length === 0 && (
          <li className="p-5 text-sm text-gray-500">Keine Dateien vorhanden.</li>
        )}
      </ul>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function formatBytes(n?: number | null): string {
  if (!n || n <= 0) return '–';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 1024 ? 1 : 0)} ${units[i]}`;
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '–';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat('de-DE', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).format(d);
  } catch {
    return iso;
  }
}
