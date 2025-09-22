import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const ALLOWED_FIELDS = new Set(['adresse','wohnflaeche_qm','zimmer','baujahr','energie_kennwert','beschreibung']);

function sanitizePatch(input: any) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(input ?? {})) {
    if (!ALLOWED_FIELDS.has(k)) continue;
    if (v === '' || v === null) { out[k] = undefined; continue; }
    switch (k) {
      case 'wohnflaeche_qm':
      case 'zimmer':
      case 'baujahr':
      case 'energie_kennwert': {
        const n = Number(v); out[k] = Number.isFinite(n) ? n : undefined; break;
      }
      default: out[k] = v;
    }
  }
  return out;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const objectId = params.id;
  const supa = getSupabaseAdmin();
  const body = await req.json().catch(() => null) as { patch?: any } | null;
  const patch = sanitizePatch(body?.patch ?? {});
  // existierende overrides + aktive Quelle laden
  const [{ data: ov }, { data: base }] = await Promise.all([
    supa.from('object_intake_overrides').select('data, base_intake_id').eq('object_id', objectId).maybeSingle(),
    supa.from('object_intakes').select('id').eq('object_id', objectId).eq('status','succeeded').order('finished_at',{ascending:false}).limit(1),
  ]);
  const current = ov?.data ?? {};
  const next = { ...current, ...patch };
  // undefinierte Felder entfernen (Reset einzelner Keys per patch)
  for (const [k, v] of Object.entries(next)) if (v === undefined) delete next[k];

  // Upsert
  const { error: upErr } = await supa.from('object_intake_overrides').upsert({
    object_id: objectId,
    base_intake_id: ov?.base_intake_id ?? base?.[0]?.id ?? null,
    data: next,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'object_id' });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // merged berechnen (leichtgewichtig): raw aus active oder dummy
  let raw: Record<string, any> = {};
  if (ov?.base_intake_id ?? base?.[0]?.id) {
    const baseId = ov?.base_intake_id ?? base?.[0]?.id;
    const { data: res } = await supa.from('intake_results').select('data').eq('intake_id', baseId as string).maybeSingle();
    if (res?.data) raw = Object.fromEntries(Object.entries(res.data).filter(([k]) => ALLOWED_FIELDS.has(k)));
  }
  const merged = { ...raw, ...next };
  return NextResponse.json({ ok: true, overrides: next, merged });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const objectId = params.id;
  const supa = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const keysParam = searchParams.get('keys'); // csv
  const keys = keysParam ? keysParam.split(',').map(s => s.trim()).filter(Boolean) : [];

  // existierende overrides lesen
  const { data: ov } = await supa.from('object_intake_overrides').select('data, base_intake_id').eq('object_id', objectId).maybeSingle();
  const current = ov?.data ?? {};

  let next: Record<string, any> = {};
  if (keys.length === 0) {
    next = {};
  } else {
    next = { ...current };
    for (const k of keys) if (ALLOWED_FIELDS.has(k)) delete next[k];
  }

  const { error: upErr } = await supa.from('object_intake_overrides').upsert({
    object_id: objectId,
    base_intake_id: ov?.base_intake_id ?? null,
    data: next,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'object_id' });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // merged zurück
  let raw: Record<string, any> = {};
  if (ov?.base_intake_id) {
    const { data: res } = await supa.from('intake_results').select('data').eq('intake_id', ov.base_intake_id).maybeSingle();
    if (res?.data) raw = Object.fromEntries(Object.entries(res.data).filter(([k]) => ALLOWED_FIELDS.has(k)));
  }
  const merged = { ...raw, ...next };
  return NextResponse.json({ ok: true, overrides: next, merged });
}
