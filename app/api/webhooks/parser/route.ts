import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { verifyHmacSHA256 } from '@/lib/security/hmac';

export const runtime = 'nodejs';
const HMAC_SECRET = process.env.INTAKE_HMAC_SECRET || '';

export async function POST(req: Request) {
  const supabaseAdmin = getSupabaseAdmin();

  const raw = await req.text();
  const ok = verifyHmacSHA256(raw, req.headers.get('x-signature'), HMAC_SECRET);
  const evt = JSON.parse(raw || '{}');

  const jobId: string | undefined = evt?.job_id;
  if (!jobId) return NextResponse.json({ error: 'job_id missing' }, { status: 400 });

  await supabaseAdmin.from('intake_webhook_events').insert({
    job_id: jobId,
    event_type: `job.${evt.status ?? 'unknown'}`,
    payload: evt,
    signature_valid: ok,
  });

  // if (!ok) return NextResponse.json({ error: 'invalid signature' }, { status: 401 });

  const { data: jobRow, error: jErr } = await supabaseAdmin
    .from('intake_jobs')
    .select('id, status, intake_id')
    .eq('id', jobId)
    .maybeSingle();

  if (jErr || !jobRow) return NextResponse.json({ error: 'job not found' }, { status: 404 });
  if (jobRow.status === 'succeeded' || jobRow.status === 'failed') {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  const now = new Date().toISOString();

  if (evt.status === 'succeeded') {
    await supabaseAdmin.from('intake_results').upsert(
      { intake_id: jobRow.intake_id, data: evt.data ?? {}, created_at: now },
      { onConflict: 'intake_id' }
    );
    await supabaseAdmin.from('intake_jobs').update({ status: 'succeeded', finished_at: now }).eq('id', jobId);
    await supabaseAdmin.from('object_intakes').update({ status: 'succeeded', finished_at: now }).eq('id', jobRow.intake_id);
  } else if (evt.status === 'failed') {
    await supabaseAdmin.from('intake_jobs').update({ status: 'failed', finished_at: now, error_text: evt.error ?? 'unknown' }).eq('id', jobId);
    await supabaseAdmin.from('object_intakes').update({ status: 'failed', finished_at: now, error_text: evt.error ?? 'unknown' }).eq('id', jobRow.intake_id);
  } else {
    await supabaseAdmin.from('intake_jobs').update({ status: evt.status ?? 'processing' }).eq('id', jobId);
    await supabaseAdmin.from('object_intakes').update({ status: evt.status ?? 'processing' }).eq('id', jobRow.intake_id);
  }

  return NextResponse.json({ ok: true });
}
