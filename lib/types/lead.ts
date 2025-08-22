/**
 * lib/types/lead.ts
 * Zentrale TS-Typen für Leads, Notizen, Historie, Filter & Pagination.
 * ACHTUNG: Hält die Statuswerte synchron zu deiner DB-Check-Constraint:
 *   'new' | 'contacted' | 'qualified' | 'converted' | 'archived'
 */

/** Primitive aliases (optional) */
export type UUID = string;
export type ISODateTimeString = string;

/** Statuswerte (DB: text + CHECK) */
export const LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'converted',
  'archived',
] as const;
export type LeadStatus = typeof LEAD_STATUSES[number];

/** DB-Schema: Leads (snake_case wie in Postgres) */
export interface DBLead {
  id: UUID;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
  source: string | null;
  /** Optionales Freitext-Feld, existiert bereits in deiner DB */
  notes: string | null;
  /** Besitzer des Leads (RLS basiert auf agent_id = auth.uid()) */
  agent_id: UUID | null;

  /** Felder aus Migration */
  street: string | null;
  postal_code: string | null;
  city: string | null;
  address_text: string | null;

  created_at: ISODateTimeString;
  updated_at: ISODateTimeString; // via trigger set_updated_at()
}

/** App-Modell: Leads (camelCase für FE) */
export interface Lead {
  id: UUID;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
  source: string | null;
  notes: string | null;
  agentId: UUID | null;

  street: string | null;
  postalCode: string | null;
  city: string | null;
  addressText: string | null;

  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

/** DB-Schema: Notizen (append-only) */
export interface DBLeadNote {
  id: UUID;
  lead_id: UUID;
  author_id: UUID;
  body: string;
  created_at: ISODateTimeString;
}

/** App-Modell: Notizen */
export interface LeadNote {
  id: UUID;
  leadId: UUID;
  authorId: UUID;
  body: string;
  createdAt: ISODateTimeString;
}

/** DB-Schema: Status-Historie */
export interface DBLeadStatusHistory {
  id: UUID;
  lead_id: UUID;
  from_status: LeadStatus | null; // kann null sein bei Erststatus
  to_status: LeadStatus;
  changed_by: UUID | null;
  changed_at: ISODateTimeString;
}

/** App-Modell: Status-Historie */
export interface LeadStatusHistory {
  id: UUID;
  leadId: UUID;
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus;
  changedBy: UUID | null;
  changedAt: ISODateTimeString;
}

/** Sortierung */
export type LeadSortField =
  | 'created_at'
  | 'full_name'
  | 'status'
  | 'city'
  | 'postal_code';

export type SortDirection = 'asc' | 'desc';

export interface SortSpec {
  field: LeadSortField;
  direction: SortDirection;
}

/** Filter für Listenabfragen */
export interface LeadFilters {
  /** Freitext über Name + Adresse (TRGM) */
  q?: string;
  statuses?: LeadStatus[];
  /** Zeitfenster über created_at */
  dateFrom?: Date | ISODateTimeString;
  dateTo?: Date | ISODateTimeString;
  city?: string;
  postalCode?: string;
}

/** Pagination (Request/Response) */
export interface PageParams {
  page?: number; // 1-basiert (Empfehlung)
  pageSize?: number; // Standard 25/50
  sort?: SortSpec;
}

export interface Page<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

/** Payloads für Schreiboperationen */
export interface CreateLeadPayload {
  fullName: string;
  street: string;
  postalCode: string;
  city: string;
  email?: string;
  phone?: string;
  source?: string;
  /** Optionale Startnotiz; in vielen UIs getrennt über AddNote */
  notes?: string;
  /** status wird serverseitig standardmäßig 'new' gesetzt */
}

export interface AddNotePayload {
  leadId: UUID;
  body: string;
}

export interface UpdateStatusPayload {
  leadId: UUID;
  toStatus: LeadStatus;
}

/**
 * Optional: Map für Status-Labels im UI
 */
export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'Neu',
  contacted: 'Kontaktiert',
  qualified: 'Qualifiziert',
  converted: 'Konvertiert',
  archived: 'Archiviert',
};
