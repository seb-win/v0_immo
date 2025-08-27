// lib/repositories/documents-repo.ts
// Implementation des Documents‑Repository auf Basis Supabase
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
    query = query.order('updated_at', { ascending: false });
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
          .select('*')
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
          // status wird durch Trigger/Logik implizit pending/overdue
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

    async listPropertyDocuments(propertyId: UUID, options?: ListOptions): Promise<Result<Page<PropertyDocumentSummary>>> {
      try {
        let q = supabase
          .from('property_documents')
          .select('id, property_id, type_id, status, due_date, supplier_email, created_by, last_seen_at_agent, created_at, updated_at, type:document_types(*)')
          .eq('property_id', propertyId);

        q = applyListOptions(q, options);

        const { data, error } = await q;
        if (error) return { ok: false, error: mapPostgrestToRepoError(error) };

        // file_count/last_file_at optional: Wird später per Aggregation ergänzt, falls nötig
        const items = (data ?? []).map((row: any) => ({
          ...row,
          type: row.type,
        })) as PropertyDocumentSummary[];

        return { ok: true, data: { items } };
      } catch (e) {
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
          .select('*')
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
          .select('*')
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
          .select('*')
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
          .select('*')
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
          .select('*')
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
