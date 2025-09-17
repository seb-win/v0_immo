import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';


export async function GET(req: Request) {
const { searchParams } = new URL(req.url);
const objectId = searchParams.get('objectId');
if (!objectId) return NextResponse.json({ error: 'objectId missing' }, { status: 400 });


const { data, error } = await supabaseAdmin
.from('object_intakes')
.select('id, filename, status, created_at')
.eq('object_id', objectId)
.order('created_at', { ascending: false });


if (error) return NextResponse.json({ error: error.message }, { status: 500 });


const runs = (data ?? []).map(r => ({
id: r.id,
filename: r.filename ?? 'upload.pdf',
uploadedAt: r.created_at,
status: r.status,
}));


return NextResponse.json({ runs });
}
