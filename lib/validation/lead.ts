/**
 * lib/validation/lead.ts
 * Zod-Schemas für Leads: Create, AddNote, Filters, Statuswechsel
 * Alle Fehlermeldungen auf Deutsch, passend zu den Typen in lib/types/lead.ts.
 */
import { z } from 'zod';
import { LEAD_STATUSES } from '../types/lead';

/** Reusable primitives */
export const uuidSchema = z.string().uuid({ message: 'Ungültige ID (UUID erwartet).' });

const nonEmpty = (label: string) =>
  z
    .string({ required_error: `${label} ist erforderlich.` })
    .trim()
    .min(1, { message: `${label} darf nicht leer sein.` });

/** Status (entspricht DB-Check-Constraint) */
export const leadStatusSchema = z.enum(LEAD_STATUSES, {
  required_error: 'Status ist erforderlich.',
  invalid_type_error: 'Ungültiger Statuswert.',
});

/** CREATE: Lead anlegen */
export const createLeadSchema = z.object({
  fullName: nonEmpty('Name'),
  street: nonEmpty('Straße'),
  postalCode: z
    .string({ required_error: 'PLZ ist erforderlich.' })
    .trim()
    // Für DE-PLZ: 5 Ziffern. Falls international geplant, Regex anpassen/lockern.
    .regex(/^\d{5}$/, { message: 'PLZ muss aus 5 Ziffern bestehen.' }),
  city: nonEmpty('Ort'),

  email: z
    .string()
    .email({ message: 'Bitte eine gültige E-Mail-Adresse eingeben.' })
    .optional(),
  phone: z
    .string()
    .trim()
    // Sehr großzügiges Pattern für Telefonnummern (+49, Leerzeichen, /, -, (), .)
    .regex(/^[\d\s+()\-/.]{5,}$/, {
      message: 'Bitte eine gültige Telefonnummer eingeben.',
    })
    .optional(),
  source: z.string().trim().max(120, { message: 'Quelle ist zu lang (max. 120 Zeichen).' }).optional(),
  notes: z.string().trim().max(2000, { message: 'Notiz ist zu lang (max. 2000 Zeichen).' }).optional(),
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

/** ADD NOTE: Notiz hinzufügen (append-only) */
export const addNoteSchema = z.object({
  leadId: uuidSchema,
  body: z
    .string({ required_error: 'Notiztext ist erforderlich.' })
    .trim()
    .min(1, { message: 'Notiz darf nicht leer sein.' })
    .max(4000, { message: 'Notiz ist zu lang (max. 4000 Zeichen).' }),
});
export type AddNoteInput = z.infer<typeof addNoteSchema>;

/** UPDATE STATUS: Statuswechsel (Historie via Trigger) */
export const updateStatusSchema = z.object({
  leadId: uuidSchema,
  toStatus: leadStatusSchema,
});
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

/** FILTERS: Liste filtern/suchen */
export const leadSortFieldSchema = z.enum(
  ['created_at', 'full_name', 'status', 'city', 'postal_code'] as const,
  { invalid_type_error: 'Ungültiges Sortierfeld.' }
);
export const sortDirectionSchema = z.enum(['asc', 'desc'] as const, {
  invalid_type_error: 'Ungültige Sortierrichtung.',
});
export const sortSpecSchema = z.object({
  field: leadSortFieldSchema,
  direction: sortDirectionSchema,
});

export const filtersSchema = z.object({
  q: z.string().trim().min(2, { message: 'Suchtext: mind. 2 Zeichen.' }).max(120, { message: 'Suchtext ist zu lang (max. 120 Zeichen).' }).optional(),
  statuses: z.array(leadStatusSchema).min(1, { message: 'Mindestens ein Status auswählen.' }).optional(),
  // Datumsangaben flexibel: ISO-String (RFC3339) ODER Date-Objekt
  dateFrom: z.union([z.string().datetime(), z.date()]).optional(),
  dateTo: z.union([z.string().datetime(), z.date()]).optional(),
  city: z.string().trim().min(2, { message: 'Ort: mind. 2 Zeichen.' }).max(120, { message: 'Ort ist zu lang (max. 120 Zeichen).' }).optional(),
  postalCode: z.string().trim().regex(/^\d{5}$/, { message: 'PLZ muss aus 5 Ziffern bestehen.' }).optional(),
  sort: sortSpecSchema.optional(),
  page: z.number().int().positive({ message: 'Seite muss > 0 sein.' }).optional(),
  pageSize: z.number().int().min(1, { message: 'pageSize muss ≥ 1 sein.' }).max(200, { message: 'pageSize ist zu groß (max. 200).' }).optional(),
});
export type LeadFiltersInput = z.infer<typeof filtersSchema>;
