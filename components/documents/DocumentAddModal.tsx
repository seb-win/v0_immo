'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { createDocumentsRepo } from '@/lib/repositories/documents-repo';
import type { DocumentType } from '@/lib/repositories/contracts';

export default function DocumentAddModal({ propertyId, onClose, onCreated }: { propertyId: string; onClose: () => void; onCreated: () => void; }) {
  const repo = useMemo(() => createDocumentsRepo(supabaseBrowser()), []);
  const [types, setTypes] = useState<DocumentType[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [dueDate, setDueDate] = useState<string>('');
  const [supplierEmail, setSupplierEmail] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    repo.listDocumentTypes().then(r => { if (r.ok) setTypes(r.data); });
  }, []);

  async function handleSave() {
    const typeIds = types.filter(t => selected[t.id]).map(t => t.id);
    if (typeIds.length === 0) return onClose();
    setSaving(true);
    const user = await supabaseBrowser().auth.getUser();
    const createdBy = user.data.user?.id as string;
    const res = await repo.createPlaceholders({ propertyId, typeIds, createdBy, dueDate: dueDate || undefined, supplierEmail: supplierEmail || undefined });
    setSaving(false);
    if (res.ok) { onCreated(); onClose(); }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Dokumente hinzufügen</h3>
          <button className="px-2 py-1" onClick={onClose}>✕</button>
        </div>
        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-auto">
          {types.map(t => (
            <label key={t.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!selected[t.id]} onChange={e => setSelected(s => ({ ...s, [t.id]: e.target.checked }))} />
              {t.label}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Fällig am (optional)</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Empfänger E‑Mail (optional)</label>
            <input type="email" value={supplierEmail} onChange={e => setSupplierEmail(e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button className="px-3 py-2 border rounded" onClick={onClose}>Abbrechen</button>
          <button className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-60" onClick={handleSave} disabled={saving}>
            {saving ? 'Speichern…' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}
