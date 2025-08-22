/**
 * lib/repositories/leads-repo.ts
 * Datenzugriffsschicht für Leads:
 * - Liste mit Filter/Suche/Pagination/Sortierung
 * - Lead-Details laden
 * - Lead anlegen (RLS: agent_id = aktueller Nutzer)
 * - Status ändern (Trigger schreibt History)
 * - Notizen append-only + Anzeige
 */

import { supabase } from '@/lib/supabase';
import type {
  DBLead,
  Lead,
  DBLeadNote,
  LeadNote,
  DBLeadStatusHistory,
  LeadStatusHistory,
  LeadFilters,
  Page,
  PageParams,
  CreateLeadPayload,
  AddNotePayload,
  UpdateStatusPayload,
  LeadStatus,
  SortSpec,
} from '@/lib/types/lead';
import { LEAD_STATUSES } from '@/lib/types/lead';
import {
  createLeadSchema,
  addNoteSchema,
  updateStatusSchema,
  filtersSchema,
} from '@/lib/validation/lead';

/* --------------------------------- Consts --------------------------------- */

const TABLE_LEADS = 'leads';
const TABLE_NOTES = 'lead_notes';
const TABLE_HISTORY = 'lead_status_history';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;

/* ------------------------------ Small helpers ----------------------------- */

function toISO(value: string | Date | null | undefined): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function escLike(s: string) {
  // Escape % and _ for ILIKE patterns
  return s.replace(/[%_]/g, (m) => '\\' + m);
}

function mapDbLead(row: DBLead): Lead {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email ?? null,
    phone: row.phone ?? null,
    status: row.status,
    source: row.source ?? null,
    notes: row.notes ?? null,
    agentId: row.agent_id ?? null,
    street: row.street ?? null,
    postalCode: row.postal_code ?? null,
    city: row.city ?? null,
    addressText: row.address_text ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDbNote(row: DBLeadNote): LeadNote {
  return {
    id: row.id,
    leadId: row.lead_id,
    authorId: row.author_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

function mapDbHistory(row: DBLeadStatusHistory): LeadStatusHistory {
  return {
    id: row.id,
    leadId: row.lead_id,
    fromStatus: (row.from_status as LeadStatus) ?? null,
    toStatus: row.to_status as LeadStatus,
    changedBy: row.changed_by ?? null,
    changedAt: row.changed_at,
  };
}

function getSort(sort?: SortSpec) {
  // Absicherung: nur erlaubte DB-Spalten
  const fallback = { column: 'created_at', ascending: false as const };
  if (!sort) return fallback;
  const map: Record<SortSpec['field'], string> = {
    created_at: 'created_at',
    full_name: 'full_name',
    status: 'status',
    city: 'city',
    postal_code: 'postal_code',
  };
  const column = map[sort.field] ?? fallback.column;
  const ascending = sort.direction === 'asc';
  return { column, ascending };
}

/* -------------------------------- Repository ------------------------------- */

/**
 * Liste der Leads mit Suche/Filter/Pagination/Sortierung
 */
export async function listLeads(
  params: (LeadFilters & PageParams) = {}
): Promise<Page<Lead>> {
  // Validierung der Eingaben (und sinnvolle Grenzen)
  const parsed = filtersSchema.safeParse(params);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(' | '));
  }
  const {
    q,
    statuses,
    dateFrom,
    dateTo,
    city,
    postalCode,
    page = DEFAULT_PAGE,
    pageSize = DEFAULT_PAGE_SIZE,
    sort,
  } = parsed.data;

  const { column, ascending } = getSort(sort);

  // Grund-Query mit Count
  let query = supabase.from<DBLead>(TABLE_LEADS).select('*', { count: 'exact' });

  // Freitextsuche über Name + Adresse + Stadt + PLZ
  if (q) {
    const needle = `%${escLike(q)}%`;
    // Supabase or() Filter: Spalten per Komma getrennt
    query = query.or(
      `full_name.ilike.${needle},address_text.ilike.${needle},city.ilike.${needle},postal_code.ilike.${needle}`
    );
  }

  // Status-Filter
  if (statuses && statuses.length > 0) {
    query = query.in('status', statuses as string[]);
  }

  // Datumsfenster (created_at)
  if (dateFrom) {
    const iso = toISO(dateFrom)!;
    query = query.gte('created_at', iso);
  }
  if (dateTo) {
    const iso = toISO(dateTo)!;
    query = query.lte('created_at', iso);
  }

  // City / PLZ
  if (city) query = query.ilike('city', `%${escLike(city)}%`);
  if (postalCode) query = query.eq('postal_code', postalCode);

  // Sortierung
  query = query.order(column as any, { ascending });

  // Pagination (1-basiert)
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) {
    throw new Error(`listLeads: ${error.message}`);
  }

  const items = (data ?? []).map(mapDbLead);
  const total = count ?? 0;

  return {
    data: items,
    page,
    pageSize,
    total,
    hasMore: to + 1 < total,
  };
}

/**
 * Einzelnen Lead laden
 */
export async function getLeadById(id: string): Promise<Lead | null> {
  const { data, error } = await supabase
    .from<DBLead>(TABLE_LEADS)
    .select('*')
    .eq('id', id)
    .single();

  // PGRST116: No rows
  if (error) {
    if ((error as any)?.code === 'PGRST116') return null;
    throw new Error(`getLeadById: ${error.message}`);
  }
  return mapDbLead(data!);
}

/**
 * Lead anlegen (RLS verlangt: agent_id = aktueller User)
 */
export async function createLead(payload: CreateLeadPayload): Promise<Lead> {
  // Validierung
  const parsed = createLeadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(' | '));
  }
  const input = parsed.data;

  // Aktuellen Nutzer ermitteln
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr) throw new Error(`createLead/auth: ${userErr.message}`);
  if (!user) throw new Error('createLead: Kein eingeloggter Nutzer.');

  const insertRow: Partial<DBLead> = {
    full_name: input.fullName,
    street: input.street,
    postal_code: input.postalCode,
    city: input.city,
    email: input.email ?? null,
    phone: input.phone ?? null,
    source: input.source ?? null,
    notes: input.notes ?? null,
    status: 'new', // Default aus Business-Logik/UI
    agent_id: user.id,
  };

  const { data, error } = await supabase
    .from<DBLead>(TABLE_LEADS)
    .insert([insertRow])
    .select()
    .single();

  if (error) throw new Error(`createLead: ${error.message}`);
  return mapDbLead(data!);
}

/**
 * Status ändern (Trigger schreibt History)
 */
export async function updateStatus(payload: UpdateStatusPayload): Promise<void> {
  const parsed = updateStatusSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(' | '));
  }
  const { leadId, toStatus } = parsed.data;

  if (!LEAD_STATUSES.includes(toStatus)) {
    throw new Error('Ungültiger Status.');
  }

  const { error } = await supabase
    .from<DBLead>(TABLE_LEADS)
    .update({ status: toStatus })
    .eq('id', leadId);

  if (error) throw new Error(`updateStatus: ${error.message}`);
  // Erfolgreich → DB-Trigger loggt in lead_status_history
}

/**
 * Notiz hinzufügen (append-only)
 */
export async function addNote(payload: AddNotePayload): Promise<LeadNote> {
  const parsed = addNoteSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(' | '));
  }
  const input = parsed.data;

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr) throw new Error(`addNote/auth: ${userErr.message}`);
  if (!user) throw new Error('addNote: Kein eingeloggter Nutzer.');

  const { data, error } = await supabase
    .from<DBLeadNote>(TABLE_NOTES)
    .insert([
      {
        lead_id: input.leadId,
        author_id: user.id,
        body: input.body,
      },
    ])
    .select()
    .single();

  if (error) throw new Error(`addNote: ${error.message}`);
  return mapDbNote(data!);
}

/**
 * Notizen zum Lead (absteigend nach created_at)
 */
export async function listNotes(leadId: string): Promise<LeadNote[]> {
  const { data, error } = await supabase
    .from<DBLeadNote>(TABLE_NOTES)
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`listNotes: ${error.message}`);
  return (data ?? []).map(mapDbNote);
}

/**
 * Status-Historie (absteigend nach changed_at)
 */
export async function listHistory(leadId: string): Promise<LeadStatusHistory[]> {
  const { data, error } = await supabase
    .from<DBLeadStatusHistory>(TABLE_HISTORY)
    .select('*')
    .eq('lead_id', leadId)
    .order('changed_at', { ascending: false });

  if (error) throw new Error(`listHistory: ${error.message}`);
  return (data ?? []).map(mapDbHistory);
}
