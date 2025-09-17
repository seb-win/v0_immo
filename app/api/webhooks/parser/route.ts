import { NextResponse } from 'next/server';
// Persist event audit regardless of signature (but flag it); if you prefer, reject when !ok
const jobId: string | undefined = evt?.job_id;
if (!jobId) return NextResponse.json({ error: 'job_id missing' }, { status: 400 });


// Audit log
await supabaseAdmin.from('intake_webhook_events').insert({
job_id: jobId,
event_type: `job.${evt.status ?? 'unknown'}`,
payload: evt,
signature_valid: ok,
});


// Optional strict mode: if HMAC invalid, stop here
// if (!ok) return NextResponse.json({ error: 'invalid signature' }, { status: 401 });


// Idempotence
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
// Upsert result
await supabaseAdmin.from('intake_results').upsert({
intake_id: jobRow.intake_id,
data: evt.data ?? {},
created_at: now,
}, { onConflict: 'intake_id' });


await supabaseAdmin.from('intake_jobs').update({ status: 'succeeded', finished_at: now }).eq('id', jobId);
await supabaseAdmin.from('object_intakes').update({ status: 'succeeded', finished_at: now }).eq('id', jobRow.intake_id);
} else if (evt.status === 'failed') {
await supabaseAdmin.from('intake_jobs').update({ status: 'failed', finished_at: now, error_text: evt.error ?? 'unknown' }).eq('id', jobId);
await supabaseAdmin.from('object_intakes').update({ status: 'failed', finished_at: now, error_text: evt.error ?? 'unknown' }).eq('id', jobRow.intake_id);
} else {
// Unknown/processing
await supabaseAdmin.from('intake_jobs').update({ status: evt.status ?? 'processing' }).eq('id', jobId);
await supabaseAdmin.from('object_intakes').update({ status: evt.status ?? 'processing' }).eq('id', jobRow.intake_id);
}


// TODO: push realtime event (Supabase Realtime or SSE)


return NextResponse.json({ ok: true });
}
