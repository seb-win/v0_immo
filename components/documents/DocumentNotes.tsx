'use client';

import { useMemo, useState } from 'react';
import type { DocumentNote } from '@/lib/repositories/contracts';
import { supabaseBrowser } from '@/lib/supabase/client';
import { createDocumentsRepo } from '@/lib/repositories/documents-repo';

export default function DocumentNotes({ propertyDocumentId, notes, onAdded }: { propertyDocumentId: string; notes: DocumentNote[]; onAdded: () => void; }) {
  const repo = useMemo(() => createDocumentsRepo(supabaseBrowser()), []);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    const user = await supabaseBrowser().auth.getUser();
    const createdBy = user.data.user?.id as string;
    const res = await repo.addNote({ propertyDocumentId, body: text, createdBy });
    setSaving(false);
    if (res.ok) { setText(''); onAdded(); }
    else alert(res.error.message || 'Fehler beim Speichern');
  }

  return (
    <div className="border rounded-lg">
      <div className="p-3 border-b bg-gray-50 font-medium">Interne Notizen</div>
      <div className="p-3 space-y-3">
        <textarea value={text} onChange={e => setText(e.target.value)} className="w-full border rounded p-2" rows={3} placeholder="Notiz hinzufügen…" />
        <div className="flex justify-end">
          <button className="px-3 py-2 border rounded disabled:opacity-50" onClick={handleSave} disabled={saving}>Speichern</button>
        </div>
        <ul className="divide-y">
          {notes.map(n => (
            <li key={n.id} className="py-2">
              <div className="text-sm whitespace-pre-wrap">{n.body}</div>
              <div className="text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
            </li>
          ))}
          {notes.length === 0 && (
            <li className="text-sm text-gray-500">Noch keine Notizen.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
