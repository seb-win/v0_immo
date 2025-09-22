import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const supa = getSupabaseAdmin();
  const body = await req.json().catch(()=>null) as { objectId?: string, seed?: boolean } | null;
  const objectId = body?.objectId;
  if (!objectId) return NextResponse.json({ error: 'objectId missing' }, { status: 400 });

  const data = body?.seed
    ? { beschreibung: 'Überarbeite Beschreibung (Override).', wohnflaeche_qm: 100 }
    : {};

  const { data: ov } = await supa
    .from('object_intake_overrides')
    .select('base_intake_id')
    .eq('object_id', objectId)
    .maybeSingle();

  const { error } = await supa.from('object_intake_overrides').upsert({
    object_id: objectId,
    base_intake_id: ov?.base_intake_id ?? null,
    data,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'object_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
