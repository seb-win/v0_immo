'use client';
import React, { useMemo, useState } from 'react';
import { IntakeRun } from '@/components/object/types';
import { UploadCard } from '@/components/object/UploadCard';
import { RunsTable } from '@/components/object/RunsTable';
import { RunDetailsDrawer } from '@/components/object/RunDetailsDrawer';
import { ResultBox } from '@/components/object/ResultBox';


export default function ObjektaufnahmePage({ params }: { params: { id: string } }) {
const objectId = params.id;
const [runs, setRuns] = useState<IntakeRun[]>([]);
const [open, setOpen] = useState(false);
const [activeRunId, setActiveRunId] = useState<string | null>(null);


function upsertRun(next: IntakeRun) {
setRuns((prev) => {
const idx = prev.findIndex((r) => r.id === next.id);
if (idx === -1) return [next, ...prev];
const copy = [...prev];
copy[idx] = { ...copy[idx], ...next };
return copy;
});
}


const activeRun = useMemo(() => runs.find((r) => r.id === activeRunId) ?? null, [runs, activeRunId]);
const latestSucceeded = useMemo(() => runs.find((r) => r.status === 'succeeded') ?? null, [runs]);


return (
<div className="space-y-8">
<UploadCard objectId={objectId} onRunCreated={upsertRun} />


<RunsTable
runs={runs}
onOpenDetails={(id) => {
setActiveRunId(id);
setOpen(true);
}}
editorHrefFor={(id) => `/objekte/${objectId}/objektaufnahme/${id}/edit`}
/>


<ResultBox latest={latestSucceeded ?? null} objectId={objectId} />


<RunDetailsDrawer open={open} onOpenChange={setOpen} run={activeRun} />
</div>
);
}
