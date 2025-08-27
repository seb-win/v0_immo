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

interface Props { propertyId: string; }

export default function DocumentsTab({ propertyId }: Props) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const repo = useMemo(() => createDocumentsRepo(supabase), [supabase]);

  const [docs, setDocs] = useState<PropertyDocumentSummary[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DocumentFile | null>(null);
  const [notes, setNotes] = useState<DocumentNote[]>([]);
  const [isAgent, setIsAgent] = useState<boolean>(true); // dynamisch via profiles.role
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState<boolean>(false);

  // Initial laden (Platzhalterliste)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const res = await repo.listPropertyDocuments(propertyId);
      if (!cancelled) {
        if (res.ok) {
          setDocs(res.data.items);
          setSelectedDocId(res.data.items[0]?.id ?? null);
        } else setError(res.error.message ?? 'Fehler beim Laden');
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [propertyId, repo]);

  // Rolle (agent/customer) laden und isAgent setzen
  useEffect(() => {
    let cancelled = false;
    async function loadRole() {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;
      const { data: prof } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', uid)
        .single();
      if (!cancelled && prof?.role) setIsAgent(prof.role === 'agent');
    }
    loadRole();
    return () => { cancelled = true; };
  }, [supabase]);

  // Customer-Access-Guard: hat der Customer Zugriff auf dieses Objekt?
  useEffect(() => {
    let cancelled = false;
    async function guard() {
      // Nur prüfen, wenn wir sicher KEIN Agent sind
      if (isAgent === false) {
        const { data: u } = await supabase.auth.getUser();
        const uid = u.user?.id;
        if (!uid) return;
        const { data, error } = await supabase
          .from('property_roles')
          .select('property_id')
          .eq('property_id', propertyId)
          .eq('user_id', uid)
          .eq('role', 'customer')
          .maybeSingle();

        if (!cancelled) {
          if (error || !data) {
            setError('Kein Zugriff auf dieses Objekt.');
            setDocs([]);
            setSelectedDocId(null);
          }
        }
      }
    }
    guard();
    return () => { cancelled = true; };
  }, [isAgent, propertyId, supabase]);

  // Dateien & Notes laden, wenn Dokument gewählt
  useEffect(() => {
    let cancelled = false;
    async function loadDetails() {
      if (!selectedDocId) { setFiles([]); setNotes([]); setSelectedFile(null); return; }
      const [filesRes, notesRes] = await Promise.all([
        repo.listFiles(selectedDocId),
        repo.listNotes(selectedDocId),
      ]);
      if (!cancelled) {
        if (filesRes.ok) setFiles(filesRes.data); else setError(filesRes.error.message ?? 'Fehler beim Laden der Dateien');
        if (notesRes.ok) setNotes(notesRes.data); else setError(notesRes.error.message ?? 'Fehler beim Laden der Notizen');
      }
    }
    loadDetails();
    return () => { cancelled = true; };
  }, [selectedDocId, repo]);

  const selectedDoc = useMemo(() => docs.find(d => d.id === selectedDocId) ?? null, [docs, selectedDocId]);
  const documentTypeKey = selectedDoc?.type?.key ?? 'unknown';

  if (loading) return <div className="p-4">Lade Dokumente…</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

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
          isAgent={isAgent}
        />
      </div>

      {/* Rechte Seite */}
      <div className={`${collapsed ? 'col-span-12 md:col-span-9' : 'col-span-12 md:col-span-9'}`}>
        {!selectedDoc && (
          <div className="p-6 border rounded-lg text-gray-500">Kein Dokument ausgewählt.</div>
        )}
        {selectedDoc && (
          <div className="space-y-4">
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

            {/* Upload + Fileliste */}
            <div className="flex items-center gap-3">
              <DocumentUploadButton
                propertyId={selectedDoc.property_id}
                propertyDocumentId={selectedDoc.id}
                documentTypeKey={documentTypeKey}
                onUploaded={async () => {
                  // Dateien neu laden + Platzhalterliste refreshten,
                  // damit das Status-Badge sofort „Hochgeladen“ zeigt.
                  const [r1, r2] = await Promise.all([
                    repo.listFiles(selectedDoc.id),
                    repo.listPropertyDocuments(propertyId),
                  ]);
                  if (r1.ok) setFiles(r1.data);
                  if (r2.ok) setDocs(r2.data.items);
                }}
              />
              {/* Platzhalter Statusanzeige */}
              <StatusBadge status={selectedDoc.status} />
            </div>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-6">
                <DocumentFileList
                  files={files}
                  onView={setSelectedFile}
                  onDeleted={async () => {
                    const r = await repo.listFiles(selectedDoc.id);
                    if (r.ok) setFiles(r.data);
                  }}
                  onToggleShare={async () => {
                    const r = await repo.listFiles(selectedDoc.id);
                    if (r.ok) setFiles(r.data);
                  }}
                  isAgent={isAgent}
                />
              </div>
              <div className="col-span-12 lg:col-span-6">
                <DocumentViewer file={selectedFile} />
              </div>
            </div>

            {isAgent && (
              <DocumentNotes
                propertyDocumentId={selectedDoc.id}
                notes={notes}
                onAdded={async () => {
                  const r = await repo.listNotes(selectedDoc.id);
                  if (r.ok) setNotes(r.data);
                }}
              />
            )}
          </div>
        )}
      </div>

      {showAdd && isAgent && (
        <DocumentAddModal
          propertyId={propertyId}
          onClose={() => setShowAdd(false)}
          onCreated={async () => {
            const r = await repo.listPropertyDocuments(propertyId);
            if (r.ok) {
              setDocs(r.data.items);
              if (!selectedDocId && r.data.items.length > 0) setSelectedDocId(r.data.items[0].id);
            }
          }}
        />
      )}
    </div>
  );
}

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
