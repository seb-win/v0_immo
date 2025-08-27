// lib/repositories/properties-repo.ts
// Implementation der Properties‑Repository‑Schnittstelle auf Basis Supabase
// Hinweis: Types/Interfaces bitte aus "lib/repositories/contracts" importieren.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PropertiesRepo,
  Result,
  RepoError,
  RepoErrorCode,
  Property,
  PropertyRole,
  CreatePropertyInput,
  UpdatePropertyInput,
  ListOptions,
  Page,
  UUID,
} from './contracts';

// -------------------------
// Fehler-Mapping
// -------------------------
function mapError(code: RepoErrorCode, message?: string, cause?: unknown): RepoError {
  return { code, message, cause };
}

function mapPostgrestToRepoError(e: any): RepoError {
  const msg = e?.message || e?.error?.message || String(e);
  const details = (e?.details || e?.hint) ? `${e?.details ?? ''} ${e?.hint ?? ''}`.trim() : undefined;

  // Grobe Heuristik
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

// -------------------------
// Hilfsfunktionen
// -------------------------
function applyListOptions(query: any, options?: ListOptions) {
  const limit = options?.limit ?? 20;
  // Keyset/Cursor könnte später ergänzt werden – zunächst einfache Range
  query = query.range(0, Math.max(0, limit - 1));

  // Suche (einfach): Titel/Adresse
  if (options?.search) {
    const s = options.search.trim();
    // Supabase v2: .or('title.ilike.%s%,address.ilike.%s%')
    query = query.or(`title.ilike.%${s}%,address.ilike.%${s}%`);
  }

  // Sort (nur erste Sortierung berücksichtigen – MVP)
  if (options?.sort && options.sort.length > 0) {
    const first = options.sort[0];
    query = query.order(first.field, { ascending: first.dir === 'asc' });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  return query;
}

// -------------------------
// Factory
// -------------------------
export function createPropertiesRepo(supabase: SupabaseClient): PropertiesRepo {
  return {
    async listProperties(options?: ListOptions): Promise<Result<Page<Property>>> {
      try {
        let q = supabase
          .from('properties')
          .select('*', { count: 'estimated' });

        q = applyListOptions(q, options);

        const { data, error, count } = await q;
        if (error) return { ok: false, error: mapPostgrestToRepoError(error) };

        return {
          ok: true,
          data: {
            items: (data ?? []) as Property[],
            total: typeof count === 'number' ? count : undefined,
            nextCursor: undefined, // Keyset kann später ergänzt werden
          },
        };
      } catch (e) {
        return { ok: false, error: mapError('unknown', 'listProperties failed', e) };
      }
    },

    async getPropertyById(id: UUID): Promise<Result<Property>> {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('id', id)
          .single();
        if (error) return { ok: false, error: mapPostgrestToRepoError(error) };
        if (!data) return { ok: false, error: mapError('not_found', 'Property not found') };
        return { ok: true, data: data as Property };
      } catch (e) {
        return { ok: false, error: mapError('unknown', 'getPropertyById failed', e) };
      }
    },

    async createProperty(input: CreatePropertyInput): Promise<Result<Property>> {
      try {
        // Agent ermitteln (auth.uid()) via Client-Session
        const { data: userRes, error: uerr } = await supabase.auth.getUser();
        if (uerr || !userRes?.user) {
          return { ok: false, error: mapError('not_authorized', 'No authenticated user') };
        }
        const agentId = userRes.user.id as UUID;

        const payload = {
          title: input.title,
          address: input.address ?? null,
          agent_id: agentId,
        };

        const { data, error } = await supabase
          .from('properties')
          .insert(payload)
          .select('*')
          .single();
        if (error) return { ok: false, error: mapPostgrestToRepoError(error) };
        return { ok: true, data: data as Property };
      } catch (e) {
        return { ok: false, error: mapError('unknown', 'createProperty failed', e) };
      }
    },

    async updateProperty(id: UUID, input: UpdatePropertyInput): Promise<Result<Property>> {
      try {
        const patch: any = {};
        if (typeof input.title !== 'undefined') patch.title = input.title;
        if (typeof input.address !== 'undefined') patch.address = input.address;

        const { data, error } = await supabase
          .from('properties')
          .update(patch)
          .eq('id', id)
          .select('*')
          .single();
        if (error) return { ok: false, error: mapPostgrestToRepoError(error) };
        if (!data) return { ok: false, error: mapError('not_found', 'Property not found') };
        return { ok: true, data: data as Property };
      } catch (e) {
        return { ok: false, error: mapError('unknown', 'updateProperty failed', e) };
      }
    },

    async grantCustomerAccess(propertyId: UUID, userId: UUID, assignedBy?: UUID): Promise<Result<PropertyRole>> {
      try {
        const row = {
          property_id: propertyId,
          user_id: userId,
          role: 'customer' as const,
          assigned_by: assignedBy ?? null,
        };
        const { data, error } = await supabase
          .from('property_roles')
          .insert(row)
          .select('*')
          .single();
        if (error) return { ok: false, error: mapPostgrestToRepoError(error) };
        return { ok: true, data: data as PropertyRole };
      } catch (e) {
        return { ok: false, error: mapError('unknown', 'grantCustomerAccess failed', e) };
      }
    },

    async revokeCustomerAccess(propertyId: UUID, userId: UUID): Promise<Result<{ property_id: UUID; user_id: UUID }>> {
      try {
        const { error } = await supabase
          .from('property_roles')
          .delete()
          .eq('property_id', propertyId)
          .eq('user_id', userId);
        if (error) return { ok: false, error: mapPostgrestToRepoError(error) };
        return { ok: true, data: { property_id: propertyId, user_id: userId } };
      } catch (e) {
        return { ok: false, error: mapError('unknown', 'revokeCustomerAccess failed', e) };
      }
    },

    async listPropertyRoles(propertyId: UUID): Promise<Result<PropertyRole[]>> {
      try {
        const { data, error } = await supabase
          .from('property_roles')
          .select('*')
          .eq('property_id', propertyId);
        if (error) return { ok: false, error: mapPostgrestToRepoError(error) };
        return { ok: true, data: (data ?? []) as PropertyRole[] };
      } catch (e) {
        return { ok: false, error: mapError('unknown', 'listPropertyRoles failed', e) };
      }
    },
  };
}
