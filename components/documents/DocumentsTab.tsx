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

  // ----- State -----
  const [docs, setDocs] = useState<PropertyDocumentSummary[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DocumentFile | null>(null);
  const [notes, setNotes] = useState<DocumentNote[]>([]);

  // Auth/Rolle/Guard
  const [authReady, setAuthReady] = useState(false);
  const [isAgent, setIsAgent] = useState<boolean | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  // UI
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState<boolean>(false);

  // ========== 1) Auth & Rolle laden ==========
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;

      if (!uid) {
        if (!active) return;
        setIsAgent(false);
        setAuthReady(true);
        return;
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', uid)
        .maybeSingle();

      if (!active) return;
      setIsAgent(prof?.role ? prof.role === 'agent' : false);
      setAuthReady(true);
    })();

    return () => { active = false; };
  }, [supabase]);

  // ========== 2) Guard – Zugriff bestimmen (erst nach Auth/Rolle) ==========
  useEffect(() => {
    let active = true;
    (async () => {
      if (!authReady || isAgent === null) return;

      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      if (!uid) { if (active) setAllowed(false); return; }

      if (isAgent === true) {
        if (!active) return;
        setAllowed(true);
        setError(null);
        return;
      }

      // Customer: property_roles prüfen
      const { data, error: prErr } = await supabase
        .from('property_roles')
        .select('property_id')
        .eq('property_id', propertyId)
        .eq('user_id', uid)
        .eq('role', 'customer')
        .maybeSingle();

      if (!active) return;

      if (prErr || !data) {
        setAllowed(false);
        setError('Kein Zugriff auf dieses Objekt.');
        // Arrays leeren (aber nicht undefined werden lassen)
        setDocs([]); setFiles([]); setNotes([]); setSelectedDocId(null); setSelectedFile(null);
      } else {
        setAllowed(true);
        setError(null);
      }
    })();

    return () => { active = false; };
  }, [authReady, isAgent, propertyId, supabase]);

  // ========== 3) Dokumente laden (erst wenn allowed === true) ==========
  useEffect(() => {
    let active = true;
    (async () => {
      if (allowed !== true) return;
      setLoadingDocs(true);

      const res = await repo.listPropertyDocuments(propertyId);
      if (!active) return;

      if (res.ok) {
        const items = res.data?.items ?? [];
        setDocs(items);
        setSelectedDocId(items?.[0]?.id ?? null);
        setError(null);
      } else {
        setError(res.error?.message ?? 'Fehler beim Laden');
        setDocs([]); setSelectedDocId(null);
      }
      setLoadingDocs(false);
    })();

    return () => { active = false; };
  }, [allowed, propertyId, repo]);

  // ========== 4) Dateien & Notizen zum ausgewählten Dokument ==========
  useEffect(() => {
    let active = true;
    (async () => {
      if (!selectedDocId || allowed !== true) {
        setFiles([]); setNotes([]); setSelectedFile(null);
        return;
      }

      const [filesRes, notesRes] = await Promise.all([
        repo.listFiles(selectedDocId),
        repo.listNotes(selectedDocId),
      ]);
      if (!active) return;

      if (filesRes.ok) setFiles(filesRes.data ?? []);
      else setFiles([]);

      if (notesRes.ok) setNotes(notesRes.data ?? []);
      else setNotes([]);
    })();

    return () => { active = false; };
  }, [selectedDocId, allowed, repo]);

  // „NEU“-Badge (nur Agent)
  const newDocIds: string[] = useMemo(() => {
    if (!isAgent) return [];
    return (docs ?? [])
      .filter(d => {
        if (d.status !== 'uploaded') return false;
        const lastFile = d.last_file_at ? Date.parse(d.last_file_at) : 0;
        const seen     = d.last_seen_at_agent ? Date.parse(d.last_seen_at_agent) : 0;
        return lastFile > seen;
      })
      .map(d => d.id);
  }, [docs, isAgent]);

  // Markiere gesehen (nur Agent)
  useEffect(() => {
    let active = true;
    (async () => {
      if (!isAgent || !selectedDocId || allowed !== true) return;
      if (!newDocIds.includes(selectedDocId)) return;

      const whenISO = new Date().toISOString();
      const res = await repo.markSeenByAgent(selectedDocId, whenISO);
      if (!active) return;

      if (res.ok) {
        setDocs(prev => (prev ?? []).map(d => d.id === selectedDocId ? { ...d, last_seen_at_agent: whenISO } : d));
      }
    })();
    return () => { active = false; };
  }, [selectedDocId, isAgent, allowed, newDocIds, repo]);

  const selectedDoc = useMemo(
    () => (docs ?? []).find(d => d.id === selectedDocId) ?? null,
    [docs, selectedDocId]
  );
  const documentTypeKey = selectedDoc?.type?.key ?? 'unknown';

  // ---------- UI States ----------
  if (!authReady || isAgent === null) {
    return <div className="p-4">Prüfe Zugriffsrechte …</div>;
  }

  if (allowed === false) {
    return <div className="p-4 text-red-600">{error ?? 'Kein Zugriff auf dieses Objekt.'}</div>;
  }

  // allowed === true ab hier
  if (loadingDocs) {
    return <div className="p-4">Lade Dokumente…</div>;
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Linke Liste */}
      <div className={`${collapsed ? 'hidden md:block md:col-span-3' : 'col-span-12 md:col-span-3'}`}>
        <DocumentListPanel
          documents={docs ?? []}
          selectedId={selectedDocId}
          onSelect={setSelectedDocId}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed(c => !c)}
          isAgent={!!isAgent}
          newIds={newDocIds ?? []}
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

            {/* Customer-Hinweis */}
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
                    if (r1.ok) setFiles(r1.data ?? []);
                    if (r2.ok) {
                      const items = r2.data?.items ?? [];
                      setDocs(items);
                      // selectedDocId bleibt gleich; optional aktualisieren
                    }
                  }}
                />
                <StatusBadge status={selectedDoc.status} />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-6">
                <DocumentFileList
                  files={files ?? []}
                  onView={setSelectedFile}
                  onDeleted={async () => {
                    const r = await repo.listFiles(selectedDoc.id);
                    setFiles(r.ok ? (r.data ?? []) : []);
                  }}
                  onToggleShare={async () => {
                    const r = await repo.listFiles(selectedDoc.id);
                    setFiles(r.ok ? (r.data ?? []) : []);
                  }}
                  isAgent={!!isAgent}
                />
              </div>
              <div className="col-span-12 lg:col-span-6">
                <DocumentViewer file={selectedFile} />
              </div>
            </div>

            <DocumentNotes
              notes={notes ?? []}
              canEdit={!!isAgent}
              onAdd={async (text) => {
                const r = await repo.addNote(selectedDoc.id, text);
                if (r.ok) {
                  setNotes(prev => [{ ...r.data, created_at: new Date().toISOString() }, ...(prev ?? [])]);
                }
              }}
              onDelete={async (noteId) => {
                const r = await repo.deleteNote(selectedDoc.id, noteId);
                if (r.ok) {
                  setNotes(prev => (prev ?? []).filter(n => n.id !== noteId));
                }
              }}
            />

            {isAgent && (
              <DocumentAddModal
                propertyId={propertyId}
                defaultTypeKey={selectedDoc?.type?.key ?? 'unknown'}
                open={showAdd}
                onOpenChange={setShowAdd}
                onCreated={async () => {
                  const r = await repo.listPropertyDocuments(propertyId);
                  if (r.ok) {
                    const items = r.data?.items ?? [];
                    setDocs(items);
                    if (!selectedDocId && items.length > 0) {
                      setSelectedDocId(items[0]?.id ?? null);
                    }
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
