'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { createDocumentsRepo } from '@/lib/repositories/documents-repo';
import type {
  PropertyDocumentSummary,
  DocumentFile,
  DocumentNote,
  DocumentStatus,
} from '@/lib/repositories/contracts';

import DocumentListPanel from './DocumentListPanel';
import DocumentViewer from './DocumentViewer';
import DocumentNotes from './DocumentNotes';
import ReminderCard from './ReminderCard';
import DocumentAddModal from './DocumentAddModal';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import useAgent from '@/hooks/use-agent';

/* -------------------------------------------------------
   Supabase Storage: ggf. euren Bucket-Namen einsetzen
   (wird nur benutzt, wenn ihr hier den Upload nutzt)
   ------------------------------------------------------- */
const DOCUMENTS_BUCKET = 'documents';

interface Props { propertyId: string }

export default function DocumentsTab({ propertyId }: Props) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const repo = useMemo(() => createDocumentsRepo(supabase), [supabase]);

  const [docs, setDocs] = useState<PropertyDocumentSummary[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DocumentFile | null>(null);

  const [notes, setNotes] = useState<DocumentNote[]>([]);

  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'document' | 'notes'>('document');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);

  const { isAgent } = useAgent();

  /* -------------------- Helpers -------------------- */

  async function refreshDocs(preferSelectId?: string | null) {
    const r = await repo.listPropertyDocuments(propertyId);
    if (r.ok) {
      const items = r.data.items ?? [];
      setDocs(items);
      if (preferSelectId) {
        setSelectedDocId(preferSelectId);
      } else if (!selectedDocId && items[0]) {
        setSelectedDocId(items[0].id);
      } else if (selectedDocId) {
        const stillThere = items.some(d => d.id === selectedDocId);
        if (!stillThere && items[0]) setSelectedDocId(items[0].id);
      }
    }
  }

  function updateDocStatus(docId: string, uploaded: boolean) {
    setDocs(prev =>
      prev.map(d =>
        d.id === docId
          ? { ...d, status: (uploaded ? 'uploaded' : 'pending') as DocumentStatus }
          : d
      )
    );
  }

  /* -------------------- Effects -------------------- */

  // Initial: Dokumente laden
  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await repo.listPropertyDocuments(propertyId);
      if (!alive) return;
      if (r.ok) {
        const items = r.data.items ?? [];
        setDocs(items);
        setSelectedDocId(items[0]?.id ?? null);
      } else {
        setErr(r.error.message ?? 'Fehler');
      }
      setLoading(false);
    })();
    return () => { alive = false };
  }, [propertyId, repo]);

  // Beim Dokumentwechsel: Viewer resetten, Files/Notes neu laden und erste Datei auswählen
  useEffect(() => {
    let alive = true;

    (async () => {
      // Reset Viewer direkt beim Wechsel
      setSelectedFile(null);
      setFiles([]);
      setNotes([]);

      if (!selectedDocId) return;

      const [fr, nr] = await Promise.all([
        repo.listFiles(selectedDocId),
        repo.listNotes(selectedDocId),
      ]);

      if (!alive) return;

      if (fr.ok) {
        const newFiles = fr.data ?? [];
        setFiles(newFiles);
        // >>> WICHTIG: Immer erste Datei setzen (Viewer-Fix A)
        setSelectedFile(newFiles[0] ?? null);
      }
      if (nr.ok) setNotes(nr.data ?? []);
    })();

    return () => { alive = false };
  }, [repo, selectedDocId]);

  const selectedDoc = docs.find(d => d.id === selectedDocId) ?? null;

  if (loading) return <div className="p-4">Lade Dokumente…</div>;
  if (err) return <div className="p-4 text-red-600">{err}</div>;

  // Map für Add-Modal: typeId -> { docId, uploaded }
  const existingByType: Record<string, { docId: string; uploaded: boolean }> = {};
  for (const d of docs) {
    const typeId = (d as any)?.type?.id as string | undefined;
    if (!typeId) continue;
    const uploaded = (d.status as DocumentStatus) === 'uploaded' || (d as any).file_count > 0;
    existingByType[typeId] = { docId: d.id, uploaded };
  }

  /* -------------------- Upload (zweistufig) -------------------- */

  async function handleUpload(file: File) {
    if (!selectedDoc) return;

    const user = await supabase.auth.getUser();
    const uploadedBy = user.data.user?.id as string | undefined;

    // 1) Pfad bauen (relativ zum Bucket)
    const storagePath = repo.buildStoragePath({
      bucket: DOCUMENTS_BUCKET, // Hinweis: bucket wird NICHT in storage_path gespeichert
      propertyId,
      documentTypeKey: selectedDoc.type?.key ?? 'unknown',
      propertyDocumentId: selectedDoc.id,
      originalFilename: file.name,
    });

    // 2) Datei in Storage hochladen
    const { error: storageErr } = await supabase
      .storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, file, { upsert: false });

    if (storageErr) {
      console.error('Storage upload failed:', storageErr);
      return;
    }

    // 3) File in DB registrieren (damit es in listFiles erscheint)
    const meta = {
      filename: file.name,
      ext: file.name.includes('.') ? file.name.split('.').pop() : null,
      mime_type: file.type || null,
      size: file.size,
      is_shared_with_customer: true,
    };

    const reg = await repo.registerUploadedFile(selectedDoc.id, meta as any, uploadedBy as any, storagePath);
    if (!reg.ok) {
      console.error('registerUploadedFile failed:', reg.error);
      return;
    }

    // 4) Files neu laden + Status setzen + Viewer-Datei setzen
    const fr = await repo.listFiles(selectedDoc.id);
    const newFiles = fr.ok ? (fr.data ?? []) : [];
    setFiles(newFiles);
    updateDocStatus(selectedDoc.id, newFiles.length > 0);
    setSelectedFile(newFiles[0] ?? null); // <<< Viewer-Fix A
  }

  /* -------------------- Render -------------------- */

  return (
    <div
      className={
        collapsed
          ? 'grid grid-cols-1 md:grid-cols-[56px_1fr] gap-4'
          : 'grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4'
      }
    >
      {/* Linke Spalte: Liste (kollabierbar) */}
      <DocumentListPanel
        docs={docs}
        selectedId={selectedDocId}
        onSelect={setSelectedDocId}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed(v => !v)}
        onAddClick={() => setShowAdd(true)}
        isAgent={isAgent}
      />

      {/* Rechte Spalte */}
      <div className="space-y-4">
        {selectedDoc && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{selectedDoc.type?.label ?? 'Dokument'}</h2>
              {isAgent && (
                <ReminderCard
                  propertyDocumentId={selectedDoc.id}
                  dueDate={selectedDoc.due_date ?? null}
                  supplierEmail={selectedDoc.supplier_email ?? null}
                />
              )}
            </div>

            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="w-full">
              <TabsList>
                <TabsTrigger value="document">Document</TabsTrigger>
                <TabsTrigger value="notes">Reminder &amp; Notes</TabsTrigger>
              </TabsList>

              {/* ---- Document-Tab: Upload + Liste + Viewer ---- */}
              <TabsContent value="document" className="mt-4 space-y-3">
                {/* Upload-Trigger (optional für Makler) */}
                {isAgent && selectedDoc && (
                  <div>
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer hover:bg-gray-50">
                      <input
                        type="file"
                        className="hidden"
                        onChange={async (e) => {
                          if (!e.target.files?.[0]) return;
                          const file = e.target.files[0];
                          try {
                            await handleUpload(file);
                          } finally {
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <span>📁 Datei hochladen</span>
                    </label>
                  </div>
                )}

                {/* Dateiliste (minimal) */}
                <div className="rounded-md border divide-y">
                  {files.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">Noch keine Dateien hochgeladen.</div>
                  ) : (
                    files.map((f: any) => (
                      <div key={f.id} className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{f.filename ?? f.name ?? 'Datei'}</div>
                          <div className="text-xs text-muted-foreground">
                            {(f.size ? Math.round(f.size / 1024) : '?')} KB
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedFile(f)} // <<< explizit setzen
                          >
                            Ansehen
                          </Button>
                          {isAgent && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={async () => {
                                if (!selectedDocId) return;
                                const del = await repo.deleteFile(f.id);
                                if (!del.ok) {
                                  console.error('deleteFile failed:', del.error);
                                  return;
                                }
                                const fr = await repo.listFiles(selectedDocId);
                                const newFiles = fr.ok ? (fr.data ?? []) : [];
                                setFiles(newFiles);
                                updateDocStatus(selectedDocId, newFiles.length > 0);

                                // <<< Viewer robust halten
                                if (!newFiles.length) {
                                  setSelectedFile(null);
                                } else if (!newFiles.find(x => x.id === selectedFile?.id)) {
                                  setSelectedFile(newFiles[0]);
                                }
                              }}
                            >
                              Löschen
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Viewer – key sorgt für sicheres Re-Rendern bei File-Wechsel */}
                <div className="rounded-md border">
                  <DocumentViewer key={selectedFile?.id ?? 'none'} file={selectedFile} />
                </div>
              </TabsContent>

              {/* ---- Notes-Tab ---- */}
              <TabsContent value="notes" className="mt-4">
                <DocumentNotes
                  propertyDocumentId={selectedDoc.id}
                  notes={notes}
                  onAdded={async () => {
                    if (!selectedDocId) return;
                    const r = await repo.listNotes(selectedDocId);
                    if (r.ok) setNotes(r.data ?? []);
                  }}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Add-Modal */}
      {showAdd && (
        <DocumentAddModal
          propertyId={propertyId}
          existingByType={existingByType}
          onClose={() => setShowAdd(false)}
          onCompleted={async ({ createdIds, removedIds }) => {
            // Optimistisch lokal entfernen
            if (removedIds?.length) {
              const removed = new Set(removedIds);
              setDocs(prev => prev.filter(d => !removed.has(d.id)));
              setSelectedDocId(prevSel => (prevSel && removed.has(prevSel) ? null : prevSel));
              // Falls das aktuell geöffnete Dokument entfernt wurde, Viewer zurücksetzen
              if (selectedDocId && removed.has(selectedDocId)) {
                setFiles([]);
                setSelectedFile(null);
              }
            }
            // Server-Refresh (inkl. evtl. neu erstelltes Dok auswählen)
            await refreshDocs(createdIds?.[0] ?? null);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}

/* Badge-Utility (optional, falls anderswo benötigt) */
export function StatusBadge({ status }: { status: DocumentStatus }) {
  const map: Record<DocumentStatus, { text: string; className: string }> = {
    uploaded: { text: 'Hochgeladen', className: 'bg-green-100 text-green-700' },
    overdue:  { text: 'Überfällig',  className: 'bg-red-100 text-red-700' },
    pending:  { text: 'Ausstehend',  className: 'bg-amber-100 text-amber-700' },
  };
  const s = map[status] ?? map.pending;
  return <span className={`px-2 py-1 rounded text-sm ${s.className}`}>{s.text}</span>;
}
