import { NextResponse } from 'next/server';
const intakeId = crypto.randomUUID();
const filename = file.name || 'upload.pdf';
const path = `${objectId}/${intakeId}/${filename}`;


// 2) Store file in storage bucket 'intake'
const arrayBuffer = await file.arrayBuffer();
const uploadRes = await supabaseAdmin.storage.from('intake').upload(path, Buffer.from(arrayBuffer), {
contentType: 'application/pdf',
upsert: false,
});
if (uploadRes.error) return NextResponse.json({ error: uploadRes.error.message }, { status: 500 });


// 3) Insert intake + job
const { error: iErr } = await supabaseAdmin.from('object_intakes').insert({
id: intakeId,
object_id: objectId,
upload_storage_path: path,
filename,
status: 'queued',
});
if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });


const jobId = crypto.randomUUID();
const { error: jErr } = await supabaseAdmin.from('intake_jobs').insert({
id: jobId,
intake_id: intakeId,
status: 'queued',
webhook_target: CALLBACK_URL,
});
if (jErr) return NextResponse.json({ error: jErr.message }, { status: 500 });


// 4) Mark processing (optional immediate)
await supabaseAdmin.from('intake_jobs').update({ status: 'processing', started_at: new Date().toISOString() }).eq('id', jobId);
await supabaseAdmin.from('object_intakes').update({ status: 'processing', started_at: new Date().toISOString() }).eq('id', intakeId);


// 5) DEV simulation (no Cloud Function yet): immediately call our webhook
if (simulate === 'ok' || simulate === 'fail') {
const payload = {
job_id: jobId,
intake_id: intakeId,
status: simulate === 'ok' ? 'succeeded' : 'failed',
data: simulate === 'ok' ? { schema_version: 'v1', dummy: true, adresse: 'Musterstraße 12', wohnflaeche_qm: 120 } : undefined,
error: simulate === 'fail' ? 'Demo-Fehler: Parser konnte PDF nicht lesen' : undefined,
duration_ms: 1234,
parser_version: 'dev-sim',
};
const raw = JSON.stringify(payload);
const sig = HMAC_SECRET ? `sha256=${require('crypto').createHmac('sha256', HMAC_SECRET).update(raw).digest('hex')}` : '';
await fetch(CALLBACK_URL, { method: 'POST', headers: { 'content-type': 'application/json', 'x-signature': sig }, body: raw });
}


// 6) Respond to client
const run: IntakeRunDto = {
id: intakeId,
filename,
uploadedAt: new Date().toISOString(),
status: 'queued', // UI kann DB poll/realtime nutzen
};
return NextResponse.json({ run });
} catch (e: any) {
return NextResponse.json({ error: e?.message || 'upload failed' }, { status: 500 });
}
}
