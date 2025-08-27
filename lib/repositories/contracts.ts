// Repositories – Interfaces (Documents & Properties)
// Stand: 2025-08-27
// Zweck: Klare API-Verträge für das Frontend (keine Implementierung)
// Hinweis: Alle Methoden geben ein Result<T> zurück (statt Exceptions)
//          – erleichtert UI-Fehlerbehandlung ohne try/catch-Noise.

// ====================================================================
// 0) Gemeinsame Typen
// ====================================================================

export type UUID = string;

export type Role = 'agent' | 'customer';
export type DocumentStatus = 'pending' | 'uploaded' | 'overdue';

export type RepoErrorCode =
  | 'not_authorized'      // RLS/Policy verhindert Zugriff
  | 'not_found'           // Datensatz existiert nicht / außerhalb Sichtbarkeit
  | 'validation_failed'   // Zod/Client-Validierung
  | 'conflict'            // z. B. Unique-Verstoß (property_id,type_id)
  | 'storage_failed'      // Upload/Storage-Fehler
  | 'network'             // Netz/Timeout
  | 'unknown';            // Fallback

export interface RepoError {
  code: RepoErrorCode;
  message?: string;
  cause?: unknown;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: RepoError };

export interface Page<T> {
  items: T[];
  total?: number;        // optional, da keyset-Pagination möglich ist
  nextCursor?: string;   // für keyset
}

export interface Sort {
  field: string;
  dir: 'asc' | 'desc';
}

export interface ListOptions {
  limit?: number;        // default 20
  cursor?: string;       // keyset
  sort?: Sort[];         // mehrere Sortierungen möglich
  search?: string;       // freie Suche (name/email/address)
  filters?: Record<string, string | number | boolean | null>;
}

// ====================================================================
// 1) Domänen-Typen (DB-nahe)
// ====================================================================

export interface Profile {
  id: UUID;
  role: Role;
  full_name?: string | null;
  created_at: string; // ISO
}

export interface Property {
  id: UUID;
  title: string;
  address?: string | null;
  agent_id?: UUID | null;
  created_at: string; // ISO
  updated_at: string; // ISO
}

export interface PropertyRole {
  property_id: UUID;
  user_id: UUID;
  role: Role; // 'agent' | 'customer'
  assigned_by?: UUID | null;
  created_at: string; // ISO
}

export interface DocumentType {
  id: UUID;
  key: string;     // z.B. 'mietvertrag'
  label: string;   // z.B. 'Mietvertrag'
  is_active: boolean;
  created_at: string; // ISO
}

export interface PropertyDocument {
  id: UUID;
  property_id: UUID;
  type_id: UUID;
  status: DocumentStatus;
  due_date?: string | null;           // YYYY-MM-DD
  supplier_email?: string | null;
  created_by?: UUID | null;
  last_seen_at_agent?: string | null; // ISO (Agent hat zuletzt gesehen)
  created_at: string;                 // ISO
  updated_at: string;                 // ISO
}

export interface PropertyDocumentSummary extends PropertyDocument {
  type?: DocumentType;           // optionaler Join
  file_count?: number;           // abgeleitet (#Files)
  last_file_at?: string | null;  // abgeleitet (ISO, letzte Datei)
}

export interface DocumentFile {
  id: UUID;
  property_document_id: UUID;
  storage_path: string; // relativ zum Bucket 'documents'
  filename: string;
  ext?: string | null;
  mime_type?: string | null;
  size?: number | null; // bytes
  is_shared_with_customer: boolean;
  uploaded_by?: UUID | null;
  created_at: string; // ISO
}

export interface DocumentNote {
  id: UUID;
  property_document_id: UUID;
  body: string;
  created_by?: UUID | null;
  created_at: string; // ISO
  edited_at?: string | null; // ISO
}

// ====================================================================
// 2) Input/DTO-Typen (für Repos)
// ====================================================================

export interface CreatePropertyInput {
  title: string;
  address?: string;
}

export interface UpdatePropertyInput {
  title?: string;
  address?: string;
}

export interface CreatePlaceholdersInput {
  propertyId: UUID;
  typeIds: UUID[];               // referenziert document_types.id
  dueDate?: string;              // YYYY-MM-DD
  supplierEmail?: string;
  createdBy: UUID;               // profiles.id
}

export interface UploadFileMeta {
  filename: string;
  ext?: string;                  // z.B. pdf, docx, jpg
  mime_type?: string;
  size?: number;                 // Bytes
  is_shared_with_customer?: boolean; // default true
}

export interface BuildStoragePathArgs {
  bucket: 'documents';
  propertyId: UUID;
  documentTypeKey: string;          // z.B. 'mietvertrag'
  propertyDocumentId: UUID;
  originalFilename: string;         // zur Ermittlung eines eindeutigen Pfades
}

export interface AddNoteInput {
  propertyDocumentId: UUID;
  body: string;
  createdBy: UUID;
}

export interface SendReminderInput {
  propertyDocumentId: UUID;
}

// ====================================================================
// 3) Repository-Interfaces
// ====================================================================

// 3.1 Properties
export interface PropertiesRepo {
  listProperties(options?: ListOptions): Promise<Result<Page<Property>>>;
  getPropertyById(id: UUID): Promise<Result<Property>>;
  createProperty(input: CreatePropertyInput): Promise<Result<Property>>;
  updateProperty(id: UUID, input: UpdatePropertyInput): Promise<Result<Property>>;

  // Zugriff/Sharing (optional; kann auch in ein AccessRepo ausgelagert werden)
  grantCustomerAccess(propertyId: UUID, userId: UUID, assignedBy?: UUID): Promise<Result<PropertyRole>>;
  revokeCustomerAccess(propertyId: UUID, userId: UUID): Promise<Result<{ property_id: UUID; user_id: UUID }>>;
  listPropertyRoles(propertyId: UUID): Promise<Result<PropertyRole[]>>;
}

// 3.2 Documents
export interface DocumentsRepo {
  // Stammdaten
  listDocumentTypes(): Promise<Result<DocumentType[]>>;

  // Platzhalter
  createPlaceholders(input: CreatePlaceholdersInput): Promise<Result<PropertyDocument[]>>;
  listPropertyDocuments(propertyId: UUID, options?: ListOptions): Promise<Result<Page<PropertyDocumentSummary>>>;
  getPropertyDocument(id: UUID): Promise<Result<PropertyDocument>>;
  markSeenByAgent(propertyDocumentId: UUID, whenISO?: string): Promise<Result<PropertyDocument>>;

  // Dateien
  buildStoragePath(args: BuildStoragePathArgs): string; // rein deterministisch, kein I/O
  registerUploadedFile(propertyDocumentId: UUID, meta: UploadFileMeta, uploadedBy: UUID, storagePath: string): Promise<Result<DocumentFile>>;

  listFiles(propertyDocumentId: UUID): Promise<Result<DocumentFile[]>>;
  deleteFile(fileId: UUID): Promise<Result<{ id: UUID }>>;
  toggleShareWithCustomer(fileId: UUID, share: boolean): Promise<Result<DocumentFile>>;

  // Notizen (nur Agent)
  addNote(input: AddNoteInput): Promise<Result<DocumentNote>>;
  listNotes(propertyDocumentId: UUID): Promise<Result<DocumentNote[]>>;

  // Erinnerung (HTTP/Edge Function – MVP: Stub)
  sendReminder(input: SendReminderInput): Promise<Result<{ property_document_id: UUID; sent_at: string }>>;
}

// ====================================================================
// 4) Fehlerbehandlung & Codes – Guidance
// ====================================================================
// Mappe DB/Storage/Netz-Fehler auf RepoErrorCode:
// - 401/403 (RLS/Policy)  -> 'not_authorized'
// - 404 (Row not found)   -> 'not_found'
// - 409 (unique_violation)-> 'conflict'
// - 4xx (Validierung)     -> 'validation_failed'
// - Storage/Upload-Fehler -> 'storage_failed'
// - Network/Timeout       -> 'network'
// - Sonstiges             -> 'unknown'

// ====================================================================
// 5) Beispiel-Flows (Kommentar, kein Code)
// ====================================================================
// A) Agent legt Platzhalter an:
// 1) UI öffnet Modal -> holt listDocumentTypes()
// 2) Auswahl -> createPlaceholders({ propertyId, typeIds, dueDate?, supplierEmail?, createdBy })
// 3) UI refresht listPropertyDocuments(propertyId)
// 4) Status wird durch DB-Trigger gesetzt (pending|overdue je nach due_date)

// B) Customer lädt Datei hoch:
// 1) UI (mit propertyId, propertyDocumentId, documentTypeKey) baut Pfad = buildStoragePath(...)
// 2) Supabase Storage Upload zum Bucket 'documents' (Client)
// 3) registerUploadedFile(propertyDocumentId, meta, uploadedBy, storagePath)
// 4) UI refresht listFiles(propertyDocumentId) + listPropertyDocuments(propertyId)
// 5) DB-Trigger setzt status -> 'uploaded'

// C) Agent schaltet Sichtbarkeit
// 1) toggleShareWithCustomer(fileId, false)
// 2) Customer sieht die Datei nicht mehr (außer wenn selbst hochgeladen)

// D) Agent markiert "Neu"-Badge als gesehen
// 1) markSeenByAgent(propertyDocumentId, new Date().toISOString())
// 2) UI berechnet NEU via: last_file_at > last_seen_at_agent (nicht updated_at)

// E) Erinnerung senden
// 1) sendReminder({ propertyDocumentId }) -> ruft Edge/Route und protokolliert Event (MVP: Stub)

// ====================================================================
// 6) Optionales AccessRepo (falls Trennung gewünscht)
// ====================================================================

export interface AccessRepo {
  grantCustomerAccess(propertyId: UUID, userId: UUID, assignedBy?: UUID): Promise<Result<PropertyRole>>;
  revokeCustomerAccess(propertyId: UUID, userId: UUID): Promise<Result<{ property_id: UUID; user_id: UUID }>>;
  listCustomersWithAccess(propertyId: UUID): Promise<Result<Profile[]>>;
}
