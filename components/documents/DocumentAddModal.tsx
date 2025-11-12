'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { createDocumentsRepo } from '@/lib/repositories/documents-repo';
import type { DocumentType } from '@/lib/repositories/contracts';

type ExistingInfo = {
  docId: string;
  uploaded: boolean; // true = Datei vorhanden => fix & disabled
};

type CompletedPayload = {
  createdIds: string[];
  removedIds: string[];
};

export default function DocumentAddModal({
  propertyId,
  onClose,
  onCompleted,               // ersetzt onCreated: liefert created & removed
  existingByType = {},       // { [typeId]: { docId, uploaded } }
}: {
  propertyId: string;
  onClose: () => void;
  onCompleted: (payload: CompletedPayload) => void;
  existingByType?: Record<string, ExistingInfo>;
}) {
  const repo = useMemo(() => createDocumentsRepo(supabaseBrowser()), []);
  const [types, setTypes] = useState<DocumentType[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [unselectedExisting, setUnselectedExisting] = useState<Record<string, boolean>>({});
  const [dueDate, setDueDate] = useState<string>('');
  const [supplierEmail, setSupplierEmail] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [onlyMissing, setOnlyMissing] = useState(false);

  const existingSet = useMemo(() => new Set(Object.keys(existingByType || {})), [existingByType]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await repo.listDocumentTypes();
      if (!alive) return;
      if (r.ok) setTypes(r.data);
    })();
    return () => { alive = false };
  }, [repo]);

  // Handler für Checkbox-Klick
  function toggleType(typeId: string) {
    const isExisting = existingSet.has(typeId);
    const existing = existingByType[typeId];

    if (isExisting) {
      // Bereits vorhanden
      if (existing.uploaded) {
        // Hochgeladen => fest & disabled (sollte im UI sowieso disabled sein)
        return;
      } else {
        // Nur Platzhalter (kein Upload) => toggelt Lösch-Flag
        setUnselectedExisting((prev) => ({
          ...prev,
          [typeId]: !prev[typeId], // true bedeutet "bei Save löschen"
        }));
      }
    } else {
      // Noch nicht vorhanden => normaler Auswahl-Flow
      setSelected((prev) => ({
        ...prev,
        [typeId]: !prev[typeId],
      }));
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { data: u } = await supabaseBrowser().auth.getUser();
      const createdBy = u.user?.id as string;

      // 1) Neue Typen anlegen (nur die, die ausgewählt und nicht bereits vorhanden sind)
      const typeIdsToCreate = types
        .filter((t) => !existingSet.has(t.id) && selected[t.id])
        .map((t) => t.id);

      let createdIds: string[] = [];
      if (typeIdsToCreate.length > 0) {
        const res = await repo.createPlaceholders({
          propertyId,
          typeIds: typeIdsToCreate,
          createdBy,
          dueDate: dueDate || undefined,
          supplierEmail: supplierEmail || undefined,
        });
        if (res.ok) {
          // viele Implementationen geben nur ok zurück; falls IDs zurückkommen, übernehme sie
          const payload = (res as any)?.data;
          if (payload && Array.isArray(payload)) {
            createdIds = payload.map((x: any) => x.id).filter(Boolean);
          }
        }
      }

      // 2) Platzhalter löschen, die abgewählt wurden (nur existing & !uploaded)
      const typeIdsToRemove = Object.keys(unselectedExisting).filter((tid) => unselectedExisting[tid] === true);
      const removedIds: string[] = [];

      for (const tid of typeIdsToRemove) {
        const info = existingByType[tid];
        if (!info) continue;
        if (info.uploaded) continue; // Sicherheitsnetz
        // ⚠️ Falls deine Repo-API anders heißt, HIER den Namen anpassen:
        const del = await (repo as any).deletePropertyDocument(info.docId);
        if (del?.ok) removedIds.push(info.docId);
      }

      onCompleted({ createdIds, removedIds });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  // UI-Filter: nur fehlende anzeigen
  const list = useMemo(() => {
    if (!onlyMissing) return types;
    return types.filter((t) => !existingSet.has(t.id));
  }, [types, onlyMissing, existingSet]);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl p-5 space-y-4 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Dokumente hinzufügen</h3>
          <button className="px-2 py-1" onClick={onClose} aria-label="Schließen">✕</button>
        </div>

        {/* Inhalte */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          {list.map((t) => {
            const isExisting = existingSet.has(t.id);
            const info = isExisting ? existingByType[t.id] : undefined;
            const isUploaded = info?.uploaded === true;
            const willBeRemoved = !!unselectedExisting[t.id];

            // Visual state
            const checked = isExisting ? !willBeRemoved : !!selected[t.id];
            const disabled = isExisting ? isUploaded : false;

            return (
              <label
                key={t.id}
                className={`flex items-center gap-2 text-sm py-1 px-1 rounded ${
                  disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                }`}
                title={isExisting ? (isUploaded ? 'Bereits hochgeladen' : 'Platzhalter vorhanden') : 'Neu anlegen'}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggleType(t.id)}
                  className="h-4 w-4"
                />
                <span className="flex-1">{t.label}</span>

                {isExisting && (
                  <span className={`text-[11px] px-2 py-0.5 rounded ${
                    isUploaded ? 'bg-green-100 text-green-700' : (willBeRemoved ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')
                  }`}>
                    {isUploaded ? 'hochgeladen' : willBeRemoved ? 'wird entfernt' : 'angelegt'}
                  </span>
                )}
              </label>
            );
          })}
        </div>

        {/* optional: Filter */}
        <div className="flex items-center gap-2">
          <input
            id="only-missing"
            type="checkbox"
            checked={onlyMissing}
            onChange={() => setOnlyMissing(v => !v)}
            className="h-4 w-4"
          />
          <label htmlFor="only-missing" className="text-sm text-muted-foreground">
            Nur fehlende anzeigen
          </label>
        </div>

        {/* Meta-Felder */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Fällig am (optional)</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full border rounded px-2 py-1"
              placeholder="tt.mm.jjjj"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Empfänger E-Mail (optional)</label>
            <input
              type="email"
              value={supplierEmail}
              onChange={e => setSupplierEmail(e.target.value)}
              className="w-full border rounded px-2 py-1"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button className="px-3 py-2 border rounded" onClick={onClose}>Abbrechen</button>
          <button
            className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Speichern…' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}
