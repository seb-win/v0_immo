import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json();
  const { job_id, intake_id, ok } = body as { job_id: string; intake_id: string; ok: boolean };
  const payload = ok
    ? { job_id, intake_id, status: 'succeeded', data: { schema_version: 'v1', dummy: true }, duration_ms: 456, parser_version: 'dev-sim' }
    : { job_id, intake_id, status: 'failed', error: 'manual dev fail' };

  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/parser`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return NextResponse.json({ ok: true });
}
