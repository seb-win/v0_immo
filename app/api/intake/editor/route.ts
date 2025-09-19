// /app/api/intake/editor/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

function deepMerge(a: any, b: any) {
  if (Array.isArray(a) || Array.isArray(b)) return b ?? a;
  if (a && typeof a === 'object' && b && typeof b === 'object') {
    const out: any = { ...a };
    for (const k of Object.keys(b)) out[k] = deepMerge(a?.[k], b[k]);
    return out;
  }
  return b ?? a;
}

export async function GET(req: Request) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const intakeId = searchParams.get('intakeId');
  if (!intakeId) return NextResponse.json({ error: 'intakeId missing' }, { status: 400 });

  const [{ data: res }, { data: draft }] = await Promise.all([
    supabase.from('intake_results').select('data, created_at').eq('intake_id', intakeId).maybeSingle(),
    supabase.from('intake_edit_drafts').select('data, updated_at').eq('intake_id', intakeId).maybeSingle(),
  ]);

  const raw = res?.data ?? {};
  const d = draft?.data ?? {};
  const merged = deepMerge(raw, d);

  return NextResponse.json({
    raw,
    draft: d,
    merged,
    rawAt: res?.created_at ?? null,
    draftAt: draft?.updated_at ?? null,
  });
}
