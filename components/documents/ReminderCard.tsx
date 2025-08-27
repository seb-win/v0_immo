'use client';

import { useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { createDocumentsRepo } from '@/lib/repositories/documents-repo';

export default function ReminderCard({ propertyDocumentId, dueDate, supplierEmail }: { propertyDocumentId: string; dueDate: string | null; supplierEmail: string | null; }) {
  const repo = useMemo(() => createDocumentsRepo(supabaseBrowser()), []);
  const [sending, setSending] = useState(false);
  const isOverdue = !!dueDate && new Date(dueDate) < new Date();

  async function sendNow() {
    setSending(true);
    const r = await repo.sendReminder({ propertyDocumentId });
    setSending(false);
    if (!r.ok) return alert(r.error.message || 'Reminder fehlgeschlagen');
    alert('Erinnerung gesendet.');
  }

  return (
    <div className="text-sm text-right">
      <div>Fällig: {dueDate ? new Date(dueDate).toLocaleDateString() : '—'}</div>
      <div>Empfänger: {supplierEmail || '—'}</div>
      <button className={`mt-1 px-3 py-1 border rounded ${isOverdue ? 'bg-red-50' : ''}`} onClick={sendNow} disabled={sending}>
        {sending ? 'Sende…' : 'Jetzt erinnern'}
      </button>
    </div>
  );
}
