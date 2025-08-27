// lib/repositories/documents-repo.ts
// Implementation des Documents-Repository auf Basis Supabase
// Siehe Verträge in ./contracts.ts

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DocumentsRepo,
  Result,
  RepoError,
  RepoErrorCode,
  DocumentType,
  PropertyDocument,
  PropertyDocumentSummary,
  DocumentFile,
  DocumentNote,
  CreatePlaceholdersInput,
  ListOptions,
  Page,
  UUID,
  UploadFileMeta,
  AddNoteInput,
} from './contracts';

// ------------------------------------------------------
// Fehler-Mapping
// ------------------------------------------------------
function mapError(code: RepoErrorCode, message?: string, cause?: unknown): RepoError {
  return { code, message, cause };
}

function mapPostgrestToRepoError(e: any): RepoError {
  const msg = e?.message || e?.error?.message || String(e);
  const details = (e?.details || e?.hint) ? `${e?.details ?? ''} ${e?.hint ?? ''}`.trim() : undefined;

  if (msg?.toLowerCase().includes('permission denied') || msg?.toLowerCase().includes('rls')) {
    return mapError('not_authorized', msg, e);
  }
  if (msg?.toLowerCase().includes('unique') || msg?.toLowerCase().includes('duplicate key')) {
    return mapError('conflict', msg, e);
  }
  if (msg?.toLowerCase().includes('not found')) {
    return mapError('not_found', msg, e);
  }
  return mapError('unknown', details ? `${msg} – ${details}` : msg, e);
}

// ------------------------------------------------------
// Helpers
// ------------------------------------------------------
function applyListOptions(query: any, options?: ListOptions) {
  const limit = options?.limit ?? 50;
  query = query.range(0, Math.max(0, limit - 1));

  if (options?.sort && options.sort.length > 0) {
    const first = options.sort[0];
    query = query.order(first.field, { ascending: first.dir === 'asc' });
  } else {
    query = query.order('created_at', { ascending: true }); // stabile Reihenfolge in der Liste
  }
  return query;
}

function randUUID(): string {
  try {
    // Browser/modern Node
    // @ts-ignore
    if (typeof crypto !== 'undefined' && crypto?.randomUUID) return crypto.randomUUID();
  } catch {}
  // Fallback
  return 'xxxxxxxxyxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ------------------------------------------------------
// Factory
// ------------------------------------------------------
export function createDocumentsRepo(supabase: SupabaseClient): DocumentsRepo {
  return {
    // --------------------------------------------------
    // Stammdaten
    // --------------------------------------------------
    async listDocumentTypes(): Promise<Result<DocumentType[]>> {
      try {
        const { data, error } = await supabase
          .from('document_types')
          .select('id, key, label, is_active, created_at')
          .eq('is_active', true)
          .order('label', { ascending: true });
        if (error) return { ok: false, error: mapPostgrestToRepoError(error) };
        return { ok: true, data: (data ?? []) as DocumentType[] };
      } catch (e) {
        return { ok: false, error: mapError('unknown', 'listDocumentTypes failed', e) };
      }
    },

    // --------------------------------------------------
    // Platzhalter
    // --------------------------------------------------
    async createPlaceholders(input: CreatePlaceholdersInput): Promise<Result<PropertyDocument[]>> {
      try {
        const rows = input.typeIds.map((typeId) => ({
          property_id: input.propertyId,
          type_id: typeId,
          due_date: input.dueDate ?? null,
          supplier_email: input.supplierEmail ?? null,
          created_by: input.createdBy,
        }));

        const { data, error } = await supabase
          .from('property_documents')
          .upsert(rows, { onConflict: 'property_id,type_id' })
          .select('*');
        if (error) return { ok: false, error: mapPostgrestToRepoError(error) };
        return { ok: true, data: (data ?? []) as PropertyDocument[] };
      } catch (e) {
        return { ok: false, error: mapError('unknown', 'createPlaceholders failed', e) };
      }
    },

    async function listPropertyDocuments(propertyId: UUID, options?: ListOptions): Promise<Result<Page<PropertyDocumentSummary>>> {
      try {
        // 1) Grunddaten je Platzhalter
        let q = supabase
          .from('property_documents')
          .select(`
            id,
            property_id,
            type_id,
            status,
            due_date,
            supplier_email,
            created_by,
            last_seen_at_agent,
            created_at,
            updated_at,
            type:document_types(id, key, label)
          `)
          .eq('property_id', propertyId);

        q = applyListOptions(q, options); // z. B. order('created_at', { ascending: true })

        const { data, error } = await q;
        if (error) return { ok: false, error: mapPostgrestToRepoError(error) };

        const itemsBase = (data ?? []) as any[];
        const ids = itemsBase.map(r => r.id) as UUID[];

        // 2) Aggregation: file_count + last_file_at (kompatibel ohne .group())
        //    Wir holen alle Files (nur id + created_at) für diese Platzhalter,
        //    sortiert absteigend -> der erste Treffer pro Platzhalter ist last_file_at.
        let fileAggMap: Record<string, { file_count: number; last_file_at: string | null }> = {};
        if (ids.length > 0) {
          const { data: files, error: filesErr } = await supabase
            .from('document_files')
            .select('property_document_id, created_at')
            .in('property_document_id', ids)
            .order('created_at', { ascending: false });

          if (filesErr) return { ok: false, error: mapPostgrestToRepoError(filesErr) };

          for (const row of (files ?? [])) {
            const pid = row.property_document_id as string;
            const created = row.created_at as string;
            const cur = fileAggMap[pid];
            if (!cur) {
              // erster Eintrag = neueste Datei, weil absteigend sortiert
              fileAggMap[pid] = { file_count: 1, last_file_at: created };
            } else {
              cur.file_count += 1;
            }
          }
        }

        // 3) Zusammenführen
        const items: PropertyDocumentSummary[] = itemsBase.map((row) => {
          const agg = fileAggMap[row.id] ?? { file_count: 0, last_file_at: null };
          return {
            id: row.id,
            property_id: row.property_id,
            type_id: row.type_id,
            status: row.status,
            due_date: row.due_date,
            supplier_email: row.supplier_email,
            created_by: row.created_by,
            last_seen_at_agent: row.last_seen_at_agent,
            created_at: row.created_at,
            updated_at: row.updated_at,
            type: row.type ? {
              id: row.type.id,
              key: row.type.key,
              label: row.type.label,
              is_active: true,
              created_at: new Date(0).toISOString(),
            } : undefined,
            file_count: agg.file_count,
            last_file_at: agg.last_file_at,
          };
        });

        return { ok: true, data: { items } };
      } catch (e) {
        console.error('listPropertyDocuments exception:', e);
        return { ok: false, error: mapError('unknown', 'listPropertyDocuments failed', e) };
      }
    },


    async getPropertyDocument(id: UUID): Promise<Result<PropertyDocument>> {
      try {
        const { data, error } = await supabase
          .from('property_documents')
          .select('*')
          .eq('id', id)
          .single();
        if (error) return { ok: false, error: mapPostgrestToRepoError(error) };
        if (!data) return { ok: false, error: mapError('not_found', 'PropertyDocument not found') };
        return { ok: true, data: data as PropertyDocument };
      } catch (e) {
        return { ok: false, error: mapError('unknown', 'getPropertyDocument failed', e) };
      }
    },

    async markSeenByAgent(propertyDocumentId: UUID, whenISO?: string) {
      try {
        const at = whenISO ?? new Date().toISOString();
        const { data, error } = await supabase
          .from('property_documents')
          .update({ last_seen_at_agent: at })
          .eq('id', propertyDocumentId)
          .select('id, property_id, status, last_seen_at_agent, updated_at')
          .single();
        if (error) return { ok: false, error: mapPostgrestToRepoError(error) };
        return { ok: true, data: data as PropertyDocument };
      } catch (e) {
        return { ok: false, error: mapError('unknown', 'markSeenByAgent failed', e) };
      }
    },

    // --------------------------------------------------
    // Dateien
    // --------------------------------------------------
    buildStoragePath({ bucket, propertyId, documentTypeKey, propertyDocumentId, originalFilename }) {
      // Hinweis: Der Bucket-Name wird NICHT in storage_path geschrieben.
      // storage_path ist relativ zum Bucket.
      const safeName = (originalFilename || 'file').replace(/[^a-zA-Z0-9_.-]/g, '_');
      const unique = randUUID();
      return `${propertyId}/${documentTypeKey}/${propertyDocumentId}/${unique}-${safeName}`;
    },

    async registerUploadedFile(propertyDocumentId: UUID, meta: UploadFileMeta, uploadedBy: UUID, storagePath: string): Promise<Result<DocumentFile>> {
      try {
        const row = {
          property_document_id: propertyDocumentId,
          storage_path: storagePath,
          filename: meta.filename,
          ext: meta.ext ?? null,
          mime_type: meta.mime_type ?? null,
          size: typeof meta.size === 'number' ? meta.size : null,
          is_shared_with_customer: typeof meta.is_shared_with_customer === 'boolean' ? meta.is_shared_with_customer : true,
          uploaded_by: uploadedBy,
        };
        const { data, error } = await supabase
          .from('document_files')
          .insert(row)
          .select('*')
          .single();
        if (error) return { ok: false, error: mapPostgrestToRepoError(error) };
        return { ok: true, data: data as DocumentFile };
      } catch (e) {
        return { ok: false, error: mapError('unknown', 'registerUploadedFile failed', e) };
      }
    },

    async listFiles(propertyDocumentId: UUID): Promise<Result<DocumentFile[]>> {
      try {
        const { data, error } = await supabase
          .from('document_files')
          .select('id, property_document_id, storage_path, filename, ext, mime_type, size, is_shared_with_customer, uploaded_by, created_at')
          .eq('property_document_id', propertyDocumentId)
          .order('created_at', { ascending: false });
        if (error) return { ok: false, error: mapPostgrestToRepoError(error) };
        return { ok: true, data: (data ?? []) as DocumentFile[] };
      } catch (e) {
        return { ok: false, error: mapError('unknown', 'listFiles failed', e) };
      }
    },

    async deleteFile(fileId: UUID): Promise<Result<{ id: UUID }>> {
      try {
        const { error } = await supabase
          .from('document_files')
          .delete()
          .eq('id', fileId);
        if (error) return { ok: false, error: mapPostgrestToRepoError(error) };
        return { ok: true, data: { id: fileId } };
      } catch (e) {
        return { ok: false, error: mapError('unknown', 'deleteFile failed', e) };
      }
    },

    async toggleShareWithCustomer(fileId: UUID, share: boolean): Promise<Result<DocumentFile>> {
      try {
        const { data, error } = await supabase
          .from('document_files')
          .update({ is_shared_with_customer: share })
          .eq('id', fileId)
          .select('id, property_document_id, storage_path, filename, ext, mime_type, size, is_shared_with_customer, uploaded_by, created_at')
          .single();
        if (error) return { ok: false, error: mapPostgrestToRepoError(error) };
        return { ok: true, data: data as DocumentFile };
      } catch (e) {
        return { ok: false, error: mapError('unknown', 'toggleShareWithCustomer failed', e) };
      }
    },

    // --------------------------------------------------
    // Notizen
    // --------------------------------------------------
    async addNote(input: AddNoteInput): Promise<Result<DocumentNote>> {
      try {
        const { data, error } = await supabase
          .from('document_notes')
          .insert({
            property_document_id: input.propertyDocumentId,
            body: input.body,
            created_by: input.createdBy,
          })
          .select('id, property_document_id, body, created_by, created_at, edited_at')
          .single();
        if (error) return { ok: false, error: mapPostgrestToRepoError(error) };
        return { ok: true, data: data as DocumentNote };
      } catch (e) {
        return { ok: false, error: mapError('unknown', 'addNote failed', e) };
      }
    },

    async listNotes(propertyDocumentId: UUID): Promise<Result<DocumentNote[]>> {
      try {
        const { data, error } = await supabase
          .from('document_notes')
          .select('id, property_document_id, body, created_by, created_at, edited_at')
          .eq('property_document_id', propertyDocumentId)
          .order('created_at', { ascending: false });
        if (error) return { ok: false, error: mapPostgrestToRepoError(error) };
        return { ok: true, data: (data ?? []) as DocumentNote[] };
      } catch (e) {
        return { ok: false, error: mapError('unknown', 'listNotes failed', e) };
      }
    },

    // --------------------------------------------------
    // Reminder Stub
    // --------------------------------------------------
    async sendReminder({ propertyDocumentId }: { propertyDocumentId: UUID }): Promise<Result<{ property_document_id: UUID; sent_at: string }>> {
      try {
        // MVP: Sofort OK zurückgeben. Später: call /api/reminder oder Edge Function.
        const sentAt = new Date().toISOString();
        return { ok: true, data: { property_document_id: propertyDocumentId, sent_at: sentAt } };
      } catch (e) {
        return { ok: false, error: mapError('unknown', 'sendReminder failed', e) };
      }
    },
  };
}
