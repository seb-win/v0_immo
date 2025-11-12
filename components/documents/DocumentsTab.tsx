'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { createDocumentsRepo } from '@/lib/repositories/documents-repo';
import type {
  DocumentFile,
  DocumentNote,
  DocumentStatus,
  PropertyDocumentSummary,
} from '@/lib/repositories/contracts';
import DocumentListPanel from './DocumentListPanel';
import DocumentAddModal from './DocumentAddModal';
import DocumentUploadButton from './DocumentUploadButton';
import DocumentFileList from './DocumentFileList';
import DocumentViewer from './DocumentViewer';
import DocumentNotes from './DocumentNotes';
import ReminderCard from './ReminderCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronRight } from 'lucide-react';

interface Props { propertyId: string; }

export default function DocumentsTab({ propertyId }: Props) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const repo = useMemo(() => createDocumentsRepo(supabase), [supabase]);

  const [docs, setDocs] = useState<PropertyDocumentSummary[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [notes, setNotes] = useState<DocumentNote[]>([]);
  const [selectedFile, setSelectedFile] = useState<DocumentFile | null>(null);
  const [isAgent, setIsAgent] = useState<boolean | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'document'|'notes'>('document');

  // Dokument-Platzhalter laden
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await repo.listPropertyDocuments(propertyId);
      if (cancelled) return;
      if (res.ok) {
        const items = res.data.items ?? [];
        setDocs(items);
        setSelectedDocId(items[0]?.id ?? null);
      } else {
        setError(res.error.message ?? 'Fehler beim Laden');
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [propertyId, repo]);

  // Rolle laden
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) {
        if (!cancelled) setIsAgent(false);
        return;
      }
      const r = await repo.getProfileRole(uid);
      if (!cancelled) setIsAgent(r.ok ? r.data?.role === 'agent' : false);
    })();
    return () => { cancelled = true; };
  }, [repo, supabase]);

  // Dateien & Notizen laden
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedDocId) {
        setFiles([]);
        setNotes([]);
        setSelectedFile(null);
        return;
      }
      const [filesRes, notesRes] = await Promise.all([
        repo.listFiles(selectedDocId),
        repo.listNotes(selectedDocId),
      ]);
      if (cancelled) return;
      if (filesRes.ok) setFiles(filesRes.data ?? []);
      else setError(filesRes.error.message ?? 'Fehler beim Laden der Dateien');
      if (notesRes.ok) setNotes(notesRes.data ?? []);
      else setError(notesRes.error.message ?? 'Fehler beim Laden der Notizen');
    })();
    return () => { cancelled = true; };
  }, [repo, selectedDocId]);

  const selectedDoc = useMemo(
    () => docs.find(d => d.id === selectedDocId) ?? null,
    [docs, selectedDocId]
  );

  if (loading) {
    return (
      <div className="p-6 border rounded-lg">
        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return <div className="p-6 border rounded-lg text-red-600">{error}</div>;
  }

  // Collapsed Header (Handle) when sidebar is collapsed (desktop)
  const CollapsedHandle = (
    <div className="hidden md:flex items-center gap-2 mb-3">
      <button
        className="inline-flex items-center gap-1 text-sm px-2 py-1 border rounded hover:bg-gray-50"
        onClick={() => setCollapsed(false)}
        aria-label="Dokumentenliste einblenden"
      >
        <ChevronRight className="h-4 w-4" />
        Dokumente
      </button>
    </div>
  );

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Linke Liste */}
      <div className={`${collapsed ? 'hidden md:block md:col-span-3' : 'col-span-12 md:col-span-3'}`}>
        <DocumentListPanel
          docs={docs}
          selectedId={selectedDocId}
          onSelect={setSelectedDocId}
          onAddClick={() => setShowAdd(true)}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed(c => !c)}
          isAgent={!!isAgent}
          newIds={[]}
        />
      </div>

      {/* Rechte Seite */}
      <div className={`${collapsed ? 'col-span-12 md:col-span-9' : 'col-span-12 md:col-span-9'}`}>
        {!selectedDoc && (
          <div className="p-6 border rounded-lg text-gray-500">Kein Dokument ausgewählt.</div>
        )}

        {selectedDoc && (
          <div className="space-y-4">
            {/* Top: Titel + optional Reminder (Agent) */}
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

            {/* Customer-Hinweis */}
            {!isAgent && (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                Du kannst hier fehlende Dateien hochladen. Die Sichtbarkeit einzelner Dateien steuert der Makler.
              </div>
            )}

            {/* Upload + Status */}
            <div className="flex items-center gap-3">
              <DocumentUploadButton
                propertyId={propertyId}
                propertyDocumentId={selectedDoc.id}
                documentTypeKey={selectedDoc.type?.key ?? null}
                onUploaded={async () => {
                  const [r1, r2] = await Promise.all([
                    repo.listFiles(selectedDoc.id),
                    repo.listPropertyDocuments(propertyId),
                  ]);
                  if (r1.ok) setFiles(r1.data ?? []);
                  if (r2.ok) setDocs(r2.data.items ?? []);
                }}
              />
              <StatusBadge status={selectedDoc.status} />
            </div>

            {/* Layout abhängig vom Sidebar-Status */}
            {!collapsed ? (
              // Sidebar sichtbar: Tabs „Document“ / „Reminder & Notes“
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList>
                  <TabsTrigger value="document">Document</TabsTrigger>
                  <TabsTrigger value="notes">Reminder &amp; Notes</TabsTrigger>
                </TabsList>
                <TabsContent value="document" className="mt-4">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 lg:col-span-6">
                      <DocumentFileList
                        files={files}
                        onView={setSelectedFile}
                        onDeleted={async () => {
                          const r = await repo.listFiles(selectedDoc.id);
                          if (r.ok) setFiles(r.data ?? []);
                        }}
                        onToggleShare={async () => {
                          const r = await repo.listFiles(selectedDoc.id);
                          if (r.ok) setFiles(r.data ?? []);
                        }}
                        isAgent={!!isAgent}
                      />
                    </div>
                    <div className="col-span-12 lg:col-span-6">
                      <DocumentViewer file={selectedFile} />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="notes" className="mt-4">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12">
                      {isAgent ? (
                        <DocumentNotes
                          propertyDocumentId={selectedDoc.id}
                          notes={notes}
                          onAdded={async () => {
                            const r = await repo.listNotes(selectedDoc.id);
                            if (r.ok) setNotes(r.data ?? []);
                          }}
                        />
                      ) : (
                        <div className="p-4 border rounded text-sm text-gray-500">
                          Notizen sind nur für Makler sichtbar.
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              // Sidebar eingeklappt: Side-by-Side → Viewer | Reminder & Notes
              <>
                {CollapsedHandle}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <DocumentViewer file={selectedFile} />
                  </div>
                  <div className="space-y-4">
                    {isAgent ? (
                      <DocumentNotes
                        propertyDocumentId={selectedDoc.id}
                        notes={notes}
                        onAdded={async () => {
                          const r = await repo.listNotes(selectedDoc.id);
                          if (r.ok) setNotes(r.data ?? []);
                        }}
                      />
                    ) : (
                      <div className="p-4 border rounded text-sm text-gray-500">
                        Notizen sind nur für Makler sichtbar.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Add-Modal */}
      {showAdd && (
        <DocumentAddModal
          propertyId={propertyId}
          onClose={() => setShowAdd(false)}
          onCreated={async () => {
            setShowAdd(false);
            const r = await repo.listPropertyDocuments(propertyId);
            if (r.ok) setDocs(r.data.items ?? []);
          }}
        />
      )}
    </div>
  );
}

// Unverändert aus deiner funktionierenden Version
function StatusBadge({ status }: { status: DocumentStatus }) {
  const color =
    status === 'uploaded'
      ? 'bg-green-100 text-green-700'
      : status === 'overdue'
      ? 'bg-red-100 text-red-700'
      : 'bg-gray-100 text-gray-700';
  const label =
    status === 'uploaded' ? 'Hochgeladen' : status === 'overdue' ? 'Überfällig' : 'Ausstehend';
  return <span className={`px-2 py-1 rounded text-sm ${color}`}>{label}</span>;
}
