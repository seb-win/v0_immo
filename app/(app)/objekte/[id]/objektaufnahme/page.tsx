'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IntakeRunDto } from '@/lib/intake/types';
import { UploadCard } from '@/components/object/UploadCard';
import { RunsTable } from '@/components/object/RunsTable';
import { RunDetailsDrawer } from '@/components/object/RunDetailsDrawer';
import { IntakeDevBar } from '@/components/object/IntakeDevBar';
import { ActiveSourceCard } from '@/components/object/ActiveSourceCard';

type IntakeRun = IntakeRunDto;

export default function ObjektaufnahmePage({ params }: { params: { id: string } }) {
  const objectId = params.id;

  const [runs, setRuns] = useState<IntakeRun[]>([]);
  const [open, setOpen] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const upsertRun = useCallback((next: IntakeRun) => {
    setRuns(prev => {
      const idx = prev.findIndex(r => r.id === next.id);
      if (idx === -1) return [next, ...prev];
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...next };
      return copy;
    });
  }, []);

  const hasActiveRuns = useMemo(
    () => runs.some(r => r.status === 'queued' || r.status === 'processing'),
    [runs]
  );

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch(`/api/intake/runs?objectId=${encodeURIComponent(objectId)}`, { cache: 'no-store' });
      const json = await res.json();
      const next: IntakeRun[] = json?.runs ?? [];
      setRuns(next);
    } catch {
      // optional: toast/log
    } finally {
      setLoading(false);
    }
  }, [objectId]);

  useEffect(() => { setLoading(true); fetchRuns(); }, [fetchRuns]);

  useEffect(() => {
    const onFocus = () => fetchRuns();
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchRuns(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchRuns]);

  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (hasActiveRuns) { pollRef.current = setInterval(fetchRuns, 4000); }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [hasActiveRuns, fetchRuns]);

  const activeRun = useMemo(() => runs.find(r => r.id === activeRunId) ?? null, [runs, activeRunId]);

  if (loading) {
    return <div className="p-4 text-sm text-gray-600">Lade Verarbeitungen …</div>;
  }

  return (
    <div className="space-y-8">
      {/* DEV-Tools (nicht in Prod) */}
      <IntakeDevBar objectId={objectId} />

      {/* 1) Upload */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Interaktives PDF hochladen</h2>
        <p className="text-sm text-gray-600">PDF auswählen oder hierher ziehen – die Verarbeitung startet automatisch.</p>
        <UploadCard
          objectId={objectId}
          onRunCreated={(newRun) => {
            upsertRun(newRun);
            fetchRuns();
          }}
        />
      </section>

      {/* 2) Verarbeitungen */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Verarbeitungen</h2>
        {/* Optional: Filterchips / Suchfeld später */}
        <RunsTable
          runs={runs}
          onOpenDetails={(id) => { setActiveRunId(id); setOpen(true); }}
          // Einzel-Run-Editing ist hier nicht vorgesehen
          editorHrefFor={undefined as unknown as (id: string) => string}
        />
        <RunDetailsDrawer open={open} onOpenChange={setOpen} run={activeRun} />
      </section>

      {/* 3) Aktive Quelle (kompakt) */}
      <section className="space-y-2">
        <ActiveSourceCard objectId={objectId} />
      </section>
    </div>
  );
}
