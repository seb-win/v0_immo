"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";

import type { Lead, LeadStatus } from "@/lib/types/lead";
import { getLeadById } from "@/lib/repositories/leads-repo";

import LeadDetailsHeader from "@/components/leads/lead-details-header";
import LeadStatusSelect from "@/components/leads/lead-status-select";
import LeadNotes from "@/components/leads/lead-notes";
import LeadHistory from "@/components/leads/lead-history";

/**
 * Lead-Detailseite
 * - Lädt den Lead per ID (RLS: nur eigene Leads sichtbar)
 * - Header (Name/Adresse/Datum) + Status-Select
 * - Notizen (append-only) + Historie
 */

export default function LeadDetailsPage() {
  const router = useRouter();
  const params = useParams() as { id?: string };
  const leadId = params?.id || "";

  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!leadId) return;
    setIsLoading(true);
    setError(null);
    try {
      const l = await getLeadById(leadId);
      if (!l) {
        setError("Lead wurde nicht gefunden oder ist nicht zugänglich.");
        setLead(null);
      } else {
        setLead(l);
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Lead konnte nicht geladen werden.";
      setError(msg);
      setLead(null);
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    load();
  }, [load]);

  function handleStatusChanged(next: LeadStatus) {
    setLead((prev) => (prev ? { ...prev, status: next } : prev));
  }

  return (
    <div className="space-y-4">
      {/* Back / Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/leads"
          className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Liste
        </Link>
      </div>

      {/* Fehleranzeige */}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Loader */}
      {isLoading && !lead && (
        <div className="rounded-md border p-4 text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          Lädt Lead …
        </div>
      )}

      {/* Inhalt */}
      {lead && (
        <>
          <LeadDetailsHeader
            lead={lead}
            rightSlot={
              <LeadStatusSelect
                leadId={lead.id}
                value={lead.status}
                onChanged={handleStatusChanged}
              />
            }
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <LeadNotes leadId={lead.id} />
            <LeadHistory leadId={lead.id} />
          </div>
        </>
      )}
    </div>
  );
}
