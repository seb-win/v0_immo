import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { IntakeRunDto } from '@/lib/intake/types';
import { randomUUID, createHmac } from 'node:crypto';

export const runtime = 'nodejs';

const CALLBACK_URL =
  process.env.INTAKE_CALLBACK_URL ||
  `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/parser`;
const HMAC_SECRET = process.env.INTAKE_HMAC_SECRET || '';

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { searchParams } = new URL(req.url);
    const objectId = searchParams.get('objectId');
    const simulate = searchParams.get('simulate'); // 'ok' | 'fail'
    if (!objectId) return NextResponse.json({ error: 'objectId missing' }, { status: 400 });

    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'file missing' }, { status: 400 });

    const intakeId = randomUUID();
    const filename = file.name || 'upload.pdf';
    const path = `${objectId}/${intakeId}/${filename}`;

    // Storage
    const arrayBuffer = await file.arrayBuffer();
    const uploadRes = await supabaseAdmin.storage
      .from('intake')
      .upload(path, Buffer.from(arrayBuffer), { contentType: 'application/pdf', upsert: false });

    if (uploadRes.error) {
      return NextResponse.json({ error: uploadRes.error.message }, { status: 500 });
    }

    // DB rows
    const { error: iErr } = await supabaseAdmin.from('object_intakes').insert({
      id: intakeId, object_id: objectId, upload_storage_path: path, filename, status: 'queued',
    });
    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

    const jobId = randomUUID();
    const { error: jErr } = await supabaseAdmin.from('intake_jobs').insert({
      id: jobId, intake_id: intakeId, status: 'queued', webhook_target: CALLBACK_URL,
    });
    if (jErr) return NextResponse.json({ error: jErr.message }, { status: 500 });

    // processing
    const nowIso = new Date().toISOString();
    await supabaseAdmin.from('intake_jobs').update({ status: 'processing', started_at: nowIso }).eq('id', jobId);
    await supabaseAdmin.from('object_intakes').update({ status: 'processing', started_at: nowIso }).eq('id', intakeId);

    // DEV simulation: sofort den Webhook rufen
    if (simulate === 'ok' || simulate === 'fail') {
      const payload: any = {
        job_id: jobId,
        intake_id: intakeId,
        status: simulate === 'ok' ? 'succeeded' : 'failed',
        data: simulate === 'ok' ? { schema_version: 'v1', dummy: true, adresse: 'Musterstraße 12', wohnflaeche_qm: 120 } : undefined,
        error: simulate === 'fail' ? 'Demo-Fehler: Parser konnte PDF nicht lesen' : undefined,
        duration_ms: 1234,
        parser_version: 'dev-sim',
      };
      const raw = JSON.stringify(payload);
      const sig = HMAC_SECRET ? `sha256=${createHmac('sha256', HMAC_SECRET).update(raw).digest('hex')}` : '';
      await fetch(CALLBACK_URL, { method: 'POST', headers: { 'content-type': 'application/json', 'x-signature': sig }, body: raw });
    }

    const run: IntakeRunDto = { id: intakeId, filename, uploadedAt: nowIso, status: 'queued' };
    return NextResponse.json({ run });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'upload failed' }, { status: 500 });
  }
}
