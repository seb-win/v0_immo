// /app/api/intake/editor/save/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

// erlaubte Felder (Draft-Whitelist)
const ALLOWED_KEYS = new Set([
  'schema_version',
  'adresse',
  'wohnflaeche_qm',
  'zimmer',
  'baujahr',
  'energie_kennwert',
  'beschreibung',
]);

function coerceNumber(x: any) {
  if (x === '' || x === null || x === undefined) return undefined;
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
}

function sanitizePatch(input: any) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(input ?? {})) {
    if (!ALLOWED_KEYS.has(k)) continue;
    switch (k) {
      case 'wohnflaeche_qm':
      case 'zimmer':
      case 'baujahr':
      case 'energie_kennwert':
        out[k] = coerceNumber(v);
        break;
      case 'schema_version':
        out[k] = v === 'v1' ? 'v1' : undefined;
        break;
      default:
        out[k] = v === '' ? undefined : v;
    }
  }
  return out;
}

// tiefer Merge: nur einfache Objekte; Arrays werden überschrieben
function deepMerge(a: any, b: any) {
  if (Array.isArray(a) || Array.isArray(b)) return b ?? a;
  if (a && typeof a === 'object' && b && typeof b === 'object') {
    const out: any = { ...a };
    for (const k of Object.keys(b)) out[k] = deepMerge(a?.[k], b[k]);
    return out;
  }
  return b ?? a;
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json().catch(() => null) as { intakeId?: string; patch?: any } | null;
    const intakeId = body?.intakeId;
    if (!intakeId) return NextResponse.json({ error: 'intakeId missing' }, { status: 400 });

    const sanitized = sanitizePatch(body?.patch ?? {});

    // bestehenden Draft lesen
    const { data: existing, error: readErr } = await supabase
      .from('intake_edit_drafts')
      .select('data')
      .eq('intake_id', intakeId)
      .maybeSingle();

    if (readErr) return NextResponse.json({ error: readErr.message, stage: 'read' }, { status: 500 });

    const nextDraft = deepMerge(existing?.data ?? {}, sanitized);

    // Upsert Draft
    const { error: upsertErr } = await supabase.from('intake_edit_drafts').upsert(
      {
        intake_id: intakeId,
        data: nextDraft,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'intake_id' }
    );

    if (upsertErr) return NextResponse.json({ error: upsertErr.message, stage: 'upsert' }, { status: 500 });

    return NextResponse.json({ ok: true, data: nextDraft });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'save_failed' }, { status: 500 });
  }
}
