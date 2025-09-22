// /app/api/objects/[id]/intake-state/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const ALLOWED_FIELDS = new Set([
  'adresse',
  'wohnflaeche_qm',
  'zimmer',
  'baujahr',
  'energie_kennwert',
  'beschreibung',
]);

const DUMMY_RAW = {
  schema_version: 'v1',
  adresse: 'Beispielweg 7, 80331 München',
  wohnflaeche_qm: 95,
  zimmer: 3,
  baujahr: 1992,
  energie_kennwert: 85,
  beschreibung: 'Helle 3-Zimmer-Wohnung mit Südbalkon. (Dummy)',
};

function deepMerge(a: any, b: any) {
  if (Array.isArray(a) || Array.isArray(b)) return b ?? a;
  if (a && typeof a === 'object' && b && typeof b === 'object') {
    const out: any = { ...a };
    for (const k of Object.keys(b)) out[k] = deepMerge(a?.[k], b[k]);
    return out;
  }
  return b ?? a;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const objectId = params.id;
  const supa = getSupabaseAdmin();

  // overrides holen
  const { data: ov, error: ovErr } = await supa
    .from('object_intake_overrides')
    .select('base_intake_id, data, updated_at')
    .eq('object_id', objectId)
    .maybeSingle();

  if (ovErr) return NextResponse.json({ error: ovErr.message }, { status: 500 });

  // last succeeded (für Fallback/Auto-Quelle)
  const { data: lastSucceeded } = await supa
    .from('object_intakes')
    .select('id, filename, finished_at')
    .eq('object_id', objectId)
    .eq('status', 'succeeded')
    .order('finished_at', { ascending: false })
    .limit(1);

  const activeIntakeId = ov?.base_intake_id ?? lastSucceeded?.[0]?.id ?? null;

  // raw laden oder Dummy
  let raw = DUMMY_RAW;
  let usedSource: 'run' | 'dummy' = 'dummy';

  if (activeIntakeId) {
    const { data: res } = await supa
      .from('intake_results')
      .select('data')
      .eq('intake_id', activeIntakeId)
      .maybeSingle();

    if (res?.data && typeof res.data === 'object') {
      raw = Object.fromEntries(
        Object.entries(res.data).filter(([k]) => ALLOWED_FIELDS.has(k))
      );
      usedSource = 'run';
    }
  }

  const overrides = ov?.data ?? {};
  const merged = deepMerge(raw, overrides);

  // runs liste (nur succeeded)
  const { data: runs, error: rErr } = await supa
    .from('object_intakes')
    .select('id, filename, finished_at')
    .eq('object_id', objectId)
    .eq('status', 'succeeded')
    .order('finished_at', { ascending: false });

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  return NextResponse.json({
    activeIntakeId,
    usedSource, // 'run' | 'dummy'
    raw,
    overrides,
    merged,
    runs: runs ?? [],
    overridesUpdatedAt: ov?.updated_at ?? null,
  });
}
