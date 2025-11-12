'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { createDocumentsRepo } from '@/lib/repositories/documents-repo';
import type { PropertyDocumentSummary, DocumentFile, DocumentNote, DocumentStatus } from '@/lib/repositories/contracts';
import DocumentListPanel from './DocumentListPanel';
import DocumentViewer from './DocumentViewer';
import DocumentFileList from './DocumentFileList';
import DocumentNotes from './DocumentNotes';
import ReminderCard from './ReminderCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Props { propertyId: string }

export default function DocumentsTab({ propertyId }: Props) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const repo = useMemo(() => createDocumentsRepo(supabase), [supabase]);

  const [docs, setDocs] = useState<PropertyDocumentSummary[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [notes, setNotes] = useState<DocumentNote[]>([]);
  const [selectedFile, setSelectedFile] = useState<DocumentFile | null>(null);

  const [collapsed, setCollapsed] = useState(false);
  const [isAgent, setIsAgent] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'document' | 'notes'>('document');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await repo.listPropertyDocuments(propertyId);
      if (!alive) return;
      if (r.ok) {
        const items = r.data.items ?? [];
        setDocs(items);
        setSelectedDocId(items[0]?.id ?? null);
      } else setErr(r.error.message ?? 'Fehler');
      setLoading(false);
    })();
    return () => { alive = false };
  }, [propertyId, repo]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const u = await supabase.auth.getUser();
      const role = await repo.getProfileRole(u.data.user?.id ?? '');
      if (!alive) return;
      setIsAgent(role.ok ? role.data?.role === 'agent' : false);
    })();
    return () => { alive = false };
  }, [repo, supabase]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!selectedDocId) { setFiles([]); setNotes([]); setSelectedFile(null); return; }
      const [fr, nr] = await Promise.all([repo.listFiles(selectedDocId), repo.listNotes(selectedDocId)]);
      if (!alive) return;
      if (fr.ok) setFiles(fr.data ?? []);
      if (nr.ok) setNotes(nr.data ?? []);
    })();
    return () => { alive = false };
  }, [repo, selectedDocId]);

  const selectedDoc = docs.find(d => d.id === selectedDocId) ?? null;

  if (loading) return <div className="p-4">Lade Dokumente…</div>;
  if (err) return <div className="p-4 text-red-600">{err}</div>;

  return (
    <div
      className={
        // Wichtig: echte Breitenänderung der linken Spalte beim Einklappen
        collapsed
          ? 'grid grid-cols-1 md:grid-cols-[56px_1fr] gap-4'
          : 'grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4'
      }
    >
      {/* Linke Spalte: Dokumentenliste (kollabierbar) */}
      <DocumentListPanel
        docs={docs}
        selectedId={selectedDocId}
        onSelect={setSelectedDocId}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed(v => !v)}
        onAddClick={() => {
          // Öffne bestehendes Add/Upload – falls du ein eigenes Modal hast, hier triggern
          if (!selectedDocId) return;
          // Minimal: Scroll zum Uploadbereich rechts – Logik ggf. später
          const el = document.getElementById('documents-upload-anchor');
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
        isAgent={isAgent}
      />

      {/* Rechte Spalte: wie gehabt; Tabs nur Beispiel – hier nichts Logisches verändert */}
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

            {!collapsed ? (
              <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="w-full">
                <TabsList>
                  <TabsTrigger value="document">Document</TabsTrigger>
                  <TabsTrigger value="notes">Reminder &amp; Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="document" className="mt-4">
                  <div id="documents-upload-anchor" className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 lg:col-span-6">
                      <DocumentFileList
                        files={files}
                        onView={setSelectedFile}
                        onDeleted={async () => {
                          if (!selectedDocId) return;
                          const r = await repo.listFiles(selectedDocId);
                          if (r.ok) setFiles(r.data ?? []);
                        }}
                        onToggleShare={async () => {
                          if (!selectedDocId) return;
                          const r = await repo.listFiles(selectedDocId);
                          if (r.ok) setFiles(r.data ?? []);
                        }}
                        isAgent={isAgent}
                      />
                    </div>
                    <div className="col-span-12 lg:col-span-6">
                      <DocumentViewer file={selectedFile} />
                    </div>
                  </div>
                </TabsContent>

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
            ) : (
              // Wenn die Liste kollabiert ist, ändert sich rechts erstmal nichts (Side-by-Side später)
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <DocumentFileList
                    files={files}
                    onView={setSelectedFile}
                    onDeleted={async () => {
                      if (!selectedDocId) return;
                      const r = await repo.listFiles(selectedDocId);
                      if (r.ok) setFiles(r.data ?? []);
                    }}
                    onToggleShare={async () => {
                      if (!selectedDocId) return;
                      const r = await repo.listFiles(selectedDocId);
                      if (r.ok) setFiles(r.data ?? []);
                    }}
                    isAgent={isAgent}
                  />
                </div>
                <div>
                  <DocumentViewer file={selectedFile} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Hilfsbadge (unverändert benötigt evtl. an anderer Stelle)
export function StatusBadge({ status }: { status: DocumentStatus }) {
  const map: Record<DocumentStatus, { text: string; className: string }> = {
    uploaded: { text: 'Hochgeladen', className: 'bg-green-100 text-green-700' },
    overdue: { text: 'Überfällig', className: 'bg-red-100 text-red-700' },
    pending: { text: 'Ausstehend', className: 'bg-gray-100 text-gray-700' },
  };
  const s = map[status] ?? map.pending;
  return <span className={`px-2 py-1 rounded text-sm ${s.className}`}>{s.text}</span>;
}
