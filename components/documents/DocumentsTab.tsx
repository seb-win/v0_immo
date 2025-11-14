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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import useAgent from '@/hooks/use-agent';

const DOCUMENTS_BUCKET = 'documents';

interface Props {
  propertyId: string;
}

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

  // ------------------------------------
  // Helpers
  // ------------------------------------

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

  // ------------------------------------
  // Effects
  // ------------------------------------

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

    return () => {
      alive = false;
    };
  }, [propertyId, repo]);

  useEffect(() => {
    let alive = true;

    (async () => {
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
        setSelectedFile(newFiles[0] ?? null);
      }

      if (nr.ok) {
        setNotes(nr.data ?? []);
      }
    })();

    return () => {
      alive = false;
    };
  }, [repo, selectedDocId]);

  const selectedDoc = docs.find(d => d.id === selectedDocId) ?? null;

  if (loading) return <div className="p-4">Lade Dokumente…</div>;
  if (err) return <div className="p-4 text-red-600">{err}</div>;

  // Map for Add-Modal
  const existingByType: Record<string, { docId: string; uploaded: boolean }> = {};
  for (const d of docs) {
    const typeId = (d as any)?.type?.id as string | undefined;
    if (!typeId) continue;
    const uploaded = (d.status as DocumentStatus) === 'uploaded' || (d as any).file_count > 0;
    existingByType[typeId] = { docId: d.id, uploaded };
  }

  // ------------------------------------
  // Upload
  // ------------------------------------

  async function handleUpload(file: File) {
    if (!selectedDoc) return;

    const user = await supabase.auth.getUser();
    const uploadedBy = user.data.user?.id as string | undefined;

    const storagePath = repo.buildStoragePath({
      bucket: DOCUMENTS_BUCKET,
      propertyId,
      documentTypeKey: selectedDoc.type?.key ?? 'unknown',
      propertyDocumentId: selectedDoc.id,
      originalFilename: file.name,
    });

    const { error: storageErr } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, file, { upsert: false });

    if (storageErr) {
      console.error('upload failed', storageErr);
      return;
    }

    const meta = {
      filename: file.name,
      ext: file.name.includes('.') ? file.name.split('.').pop() : null,
      mime_type: file.type || null,
      size: file.size,
      is_shared_with_customer: true,
    };

    const reg = await repo.registerUploadedFile(
      selectedDoc.id,
      meta as any,
      uploadedBy as any,
      storagePath
    );

    if (!reg.ok) {
      console.error('registerUploadedFile failed', reg.error);
      return;
    }

    const fr = await repo.listFiles(selectedDoc.id);
    const newFiles = fr.ok ? fr.data ?? [] : [];
    setFiles(newFiles);
    updateDocStatus(selectedDoc.id, newFiles.length > 0);
    setSelectedFile(newFiles[0] ?? null);
  }

  // -------------------------------------------------------
  // NEW LAYOUT (wie Leads-Seite)
  // -------------------------------------------------------

  return (
    <div className="space-y-4 min-h-[calc(100vh-120px)] flex flex-col"> {/* NEW: global spacing wie Leads */}
      
      <div
        className={`
          grid grid-cols-1 gap-4
          ${collapsed ? 'lg:grid-cols-[56px_minmax(0,1fr)]' : 'lg:grid-cols-[280px_minmax(0,1fr)]'}
        `}
      >
        {/* ------------------------------ */}
        {/* Linke Box — DocumentListPanel */}
        {/* ------------------------------ */}
        <DocumentListPanel
          docs={docs}
          selectedId={selectedDocId}
          onSelect={setSelectedDocId}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed(v => !v)}
          onAddClick={() => setShowAdd(true)}
          isAgent={isAgent}
        />

        {/* ------------------------------ */}
        {/* Rechte Box — jetzt als Card    */}
        {/* ------------------------------ */}
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                {selectedDoc?.type?.label ?? 'Dokument'}
              </CardTitle>

              {isAgent && selectedDoc && (
                <ReminderCard
                  propertyDocumentId={selectedDoc.id}
                  dueDate={selectedDoc.due_date ?? null}
                  supplierEmail={selectedDoc.supplier_email ?? null}
                />
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {selectedDoc && (
              <Tabs
                value={activeTab}
                onValueChange={v => setActiveTab(v as any)}
                className="w-full"
              >
                <TabsList>
                  <TabsTrigger value="document">Document</TabsTrigger>
                  <TabsTrigger value="notes">Reminder &amp; Notes</TabsTrigger>
                </TabsList>

                {/* -------------------- */}
                {/* Document Tab        */}
                {/* -------------------- */}
                <TabsContent value="document" className="space-y-4">
                  {isAgent && (
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
                  )}

                  <div className="rounded-md border divide-y">
                    {files.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">
                        Noch keine Dateien hochgeladen.
                      </div>
                    ) : (
                      files.map((f: any) => (
                        <div
                          key={f.id}
                          className="p-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {f.filename ?? f.name ?? 'Datei'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {(f.size ? Math.round(f.size / 1024) : '?')} KB
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedFile(f)}
                            >
                              Ansehen
                            </Button>

                            {isAgent && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={async () => {
                                  const del = await repo.deleteFile(f.id);
                                  if (!del.ok) {
                                    console.error('delete failed', del.error);
                                    return;
                                  }

                                  const fr = await repo.listFiles(selectedDocId!);
                                  const newFiles = fr.ok ? fr.data ?? [] : [];
                                  setFiles(newFiles);

                                  updateDocStatus(selectedDocId!, newFiles.length > 0);

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

                  <DocumentViewer
                    key={selectedFile?.id ?? 'none'}
                    file={selectedFile}
                  />
                </TabsContent>

                {/* -------------------- */}
                {/* Notes Tab           */}
                {/* -------------------- */}
                <TabsContent value="notes">
                  <DocumentNotes
                    propertyDocumentId={selectedDoc.id}
                    notes={notes}
                    onAdded={async () => {
                      const r = await repo.listNotes(selectedDoc.id);
                      if (r.ok) setNotes(r.data ?? []);
                    }}
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add-Modal */}
      {showAdd && (
        <DocumentAddModal
          propertyId={propertyId}
          existingByType={existingByType}
          onClose={() => setShowAdd(false)}
          onCompleted={async ({ createdIds, removedIds }) => {
            if (removedIds?.length) {
              const removed = new Set(removedIds);
              setDocs(prev => prev.filter(d => !removed.has(d.id)));
              if (selectedDocId && removed.has(selectedDocId)) {
                setSelectedDocId(null);
                setFiles([]);
                setSelectedFile(null);
              }
            }

            await refreshDocs(createdIds?.[0] ?? null);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}
