import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const supa = getSupabaseAdmin();
  const body = await req.json().catch(()=>null) as { objectId?: string, variant?: 'wohn'|'haus' } | null;
  const objectId = body?.objectId;
  if (!objectId) return NextResponse.json({ error: 'objectId missing' }, { status: 400 });

  const now = new Date().toISOString();
  const intakeId = crypto.randomUUID();
  const filename = `dummy_${new Date().getTime()}.pdf`;

  const raw =
    body?.variant === 'haus'
      ? { schema_version:'v1', adresse:'Gartenstraße 5, 85221 Dachau', wohnflaeche_qm:145, zimmer:5, baujahr:1978, energie_kennwert:112, beschreibung:'Einfamilienhaus (Dummy).' }
      : { schema_version:'v1', adresse:'Beispielweg 7, 80331 München', wohnflaeche_qm:95, zimmer:3, baujahr:1992, energie_kennwert:85, beschreibung:'Wohnung (Dummy).' };

  await supa.from('object_intakes').insert({
    id: intakeId, object_id: objectId, upload_storage_path: 'dummy', filename, status: 'succeeded', started_at: now, finished_at: now,
  });
  await supa.from('intake_jobs').insert({
    id: crypto.randomUUID(), intake_id: intakeId, status: 'succeeded', webhook_target: 'dummy', started_at: now, finished_at: now,
  });
  await supa.from('intake_results').upsert({ intake_id: intakeId, data: raw, created_at: now }, { onConflict: 'intake_id' });

  return NextResponse.json({ ok: true, intakeId, raw });
}
