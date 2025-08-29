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

  // 🔧 PATCH: Rolle ist jetzt tri-state (null | boolean)
  // null = Rolle noch nicht geladen → Guard wartet, bis bekannt
  const [isAgent, setIsAgent] = useState<boolean | null>(null);

  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState<boolean>(false);

  // 1) Dokumentliste laden
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const res = await repo.listPropertyDocuments(propertyId);
      if (!cancelled) {
        if (res.ok) {
          setDocs(res.data.items);
          setSelectedDocId(res.data.items[0]?.id ?? null);
        } else {
          setError(res.error.message ?? 'Fehler beim Laden');
        }
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [propertyId, repo]);

  // 2) Rolle laden (agent/customer) → isAgent setzen
  useEffect(() => {
    let cancelled = false;
    async function loadRole() {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) { if (!cancelled) setIsAgent(false); return; }
      const { data: prof } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', uid)
        .maybeSingle();

      // 🔧 PATCH: Wenn keine Rolle gefunden → als Customer behandeln (false),
      // wichtig ist: isAgent ist *nicht* mehr default false, sondern wir warten bis hier.
      if (!cancelled) setIsAgent(prof?.role ? prof.role === 'agent' : false);
    }
    loadRole();
    return () => { cancelled = true; };
  }, [supabase]);

  // 3) 🔧 PATCH: Customer-Access-Guard wartet, bis Rolle bekannt ist
  // Agents: sofort Zugriff (Fehler ggf. zurücksetzen)
  // Customers: property_roles prüfen
  useEffect(() => {
    let cancelled = false;
    async function guard() {
      // warten bis Rolle bestimmt ist
      if (isAgent === null) return;

      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return;

      if (isAgent === true) {
        // Agenten: Zugriff gewähren, evtl. zuvor gesetzte Fehlermeldung entfernen
        if (!cancelled) setError(null);
        return;
      }

      // Customer: Relation prüfen
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
        } else {
          setError(null);
        }
      }
    }
    guard();
    return () => { cancelled = true; };
  }, [isAgent, propertyId, supabase]);

  // 4) Dateien & Notizen zum ausgewählten Dokument laden
  useEffect(() => {
    let cancelled = false;
    async function loadDetails() {
      if (!selectedDocId) { setFiles([]); setNotes([]); setSelectedFile(null); return; }
      const [filesRes, notesRes] = await Promise.all([
        repo.listFiles(selectedDocId),
        repo.listNotes(selectedDocId),
      ]);
      if (!cancelled) {
        if (filesRes.ok) setFiles(filesRes.data);
        else setError(filesRes.error.message ?? 'Fehler beim Laden der Dateien');
        if (notesRes.ok) setNotes(notesRes.data);
        else setError(notesRes.error.message ?? 'Fehler beim Laden der Notizen');
      }
    }
    loadDetails();
    return () => { cancelled = true; };
  }, [selectedDocId, repo]);

  // „NEU“-Badge: basiert auf last_file_at vs. last_seen_at_agent
  const newDocIds: string[] = useMemo(() => {
    if (!isAgent) return [];
    return docs
      .filter(d => {
        if (d.status !== 'uploaded') return false;
        const lastFile = d.last_file_at ? Date.parse(d.last_file_at) : 0;
        const seen     = d.last_seen_at_agent ? Date.parse(d.last_seen_at_agent) : 0;
        return lastFile > seen;
      })
      .map(d => d.id);
  }, [docs, isAgent]);

  // Gesehen-Markierung (nur Agent)
  useEffect(() => {
    let cancelled = false;
    async function markSeen() {
      if (!isAgent || !selectedDocId) return;
      if (!newDocIds.includes(selectedDocId)) return;

      const whenISO = new Date().toISOString();
      const res = await repo.markSeenByAgent(selectedDocId, whenISO);
      if (!cancelled) {
        if (res.ok) {
          setDocs(prev => prev.map(d => d.id === selectedDocId ? { ...d, last_seen_at_agent: whenISO } : d));
        } else {
          console.warn('markSeenByAgent fehlgeschlagen:', res.error);
        }
      }
    }
    markSeen();
    return () => { cancelled = true; };
  }, [selectedDocId, isAgent, newDocIds, repo]);

  const selectedDoc = useMemo(
    () => docs.find(d => d.id === selectedDocId) ?? null,
    [docs, selectedDocId]
  );
  const documentTypeKey = selectedDoc?.type?.key ?? 'unknown';

  // UI-States
  if (loading) return <div className="p-4">Lade Dokumente…</div>;

  // 🔧 PATCH: solange Rolle noch nicht bestimmt ist, Guard NICHT ausführen → freundlicher Hint
  if (isAgent === null) return <div className="p-4">Prüfe Zugriffsrechte …</div>;

  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Linke Liste */}
      <div className={`${collapsed ? 'hidden md:block md:col-span-3' : 'col-span-12 md:col-span-3'}`}>
        <DocumentListPanel
          documents={docs}
          selectedId={selectedDocId}
          onSelect={setSelectedDocId}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed(c => !c)}
          isAgent={!!isAgent}
          newIds={newDocIds}
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

            {/* Customer-Hinweis (nur wenn kein Agent) */}
            {!isAgent && (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                Du kannst hier fehlende Dateien hochladen. Die Sichtbarkeit einzelner Dateien steuert der Makler.
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-gray-600">
                {selectedDoc.description ?? '—'}
              </div>

              <div className="flex items-center gap-2">
                <DocumentUploadButton
                  propertyId={propertyId}
                  propertyDocumentId={selectedDoc.id}
                  canEdit={!!isAgent}
                  onUploaded={async () => {
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
                  isAgent={!!isAgent}
                />
              </div>
              <div className="col-span-12 lg:col-span-6">
                <DocumentViewer file={selectedFile} />
              </div>
            </div>

            <DocumentNotes
              notes={notes}
              canEdit={!!isAgent}
              onAdd={async (text) => {
                const r = await repo.addNote(selectedDoc.id, text);
                if (r.ok) {
                  setNotes(prev => [{ ...r.data, created_at: new Date().toISOString() }, ...prev]);
                }
              }}
              onDelete={async (noteId) => {
                const r = await repo.deleteNote(selectedDoc.id, noteId);
                if (r.ok) {
                  setNotes(prev => prev.filter(n => n.id !== noteId));
                }
              }}
            />

            {/* Nur Agenten dürfen neue Dokument-Typen hinzufügen */}
            {isAgent && (
              <DocumentAddModal
                propertyId={propertyId}
                defaultTypeKey={documentTypeKey}
                open={showAdd}
                onOpenChange={setShowAdd}
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
        )}
      </div>
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
