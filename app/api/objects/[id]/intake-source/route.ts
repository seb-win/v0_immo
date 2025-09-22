import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const ALLOWED_FIELDS = new Set(['adresse','wohnflaeche_qm','zimmer','baujahr','energie_kennwert','beschreibung']);

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const objectId = params.id;
  const supa = getSupabaseAdmin();
  const body = await req.json().catch(() => null) as { intakeId?: string } | null;
  const intakeId = body?.intakeId;
  if (!intakeId) return NextResponse.json({ error: 'intakeId missing' }, { status: 400 });

  // Rohdaten der neuen Quelle laden
  const { data: res, error: resErr } = await supa
    .from('intake_results')
    .select('data')
    .eq('intake_id', intakeId)
    .maybeSingle();
  if (resErr || !res?.data) return NextResponse.json({ error: 'raw not found for intake' }, { status: 404 });
  const raw = Object.fromEntries(Object.entries(res.data).filter(([k]) => ALLOWED_FIELDS.has(k)));

  // existierende overrides lesen (oder {} wenn keine Zeile)
  const { data: ovRow } = await supa
    .from('object_intake_overrides')
    .select('data')
    .eq('object_id', objectId)
    .maybeSingle();
  const overrides = ovRow?.data ?? {};

  // Rebase: overrides-Schlüssel entfernen, deren Wert == raw-Wert
  const cleaned: Record<string, any> = { ...overrides };
  for (const [k, v] of Object.entries(overrides)) {
    if (!ALLOWED_FIELDS.has(k)) { delete cleaned[k]; continue; }
    if (raw?.[k] === v) delete cleaned[k];
  }

  // Upsert base_intake_id + cleaned overrides
  const { error: upErr } = await supa.from('object_intake_overrides').upsert({
    object_id: objectId,
    base_intake_id: intakeId,
    data: cleaned,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'object_id' });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // Merged zurückgeben (für UI)
  const merged = { ...raw, ...cleaned };
  return NextResponse.json({ ok: true, activeIntakeId: intakeId, raw, overrides: cleaned, merged });
}
