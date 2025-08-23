"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { History as HistoryIcon, Loader2, RefreshCw, ArrowRight } from "lucide-react";
import type { LeadStatusHistory } from "@/lib/types/lead";
import { LEAD_STATUS_LABEL } from "@/lib/types/lead";
import { listHistory } from "@/lib/repositories/leads-repo";
import LeadStatusBadge from "./lead-status-badge";

/**
 * LeadHistory
 * - Zeigt die Statuswechsel eines Leads in umgekehrter Chronologie.
 * - Datenquelle: listHistory(leadId) – bereits nach changed_at DESC sortiert.
 */

type LeadHistoryProps = {
  leadId: string;
  className?: string;
};

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

export default function LeadHistory({ leadId, className }: LeadHistoryProps) {
  const [items, setItems] = useState<LeadStatusHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const count = useMemo(() => items.length, [items]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await listHistory(leadId);
      setItems(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Historie konnte nicht geladen werden.";
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className={cx("rounded-md border bg-card", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <HistoryIcon className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Historie</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{count}</span>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={isLoading}
          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
          aria-label="Historie neu laden"
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Aktualisieren
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-4">
        {loadError ? (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {loadError}
          </div>
        ) : !isLoading && items.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Keine Statusänderungen vorhanden.</div>
        ) : (
          <ul className="relative">
            {/* Timeline line */}
            <div className="absolute left-2 top-0 bottom-0 w-px bg-border" aria-hidden />
            {items.map((h) => (
              <li key={h.id} className="relative pl-6">
                {/* Dot */}
                <span
                  aria-hidden
                  className="absolute left-1 top-3 inline-block h-2 w-2 -translate-x-1/2 rounded-full bg-foreground"
                />

                <div className="mb-3 rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Geändert:</span> {formatDateTime(h.changedAt)}
                    </div>
                    {/* Optional: changedBy anzeigen (gekürzt), falls vorhanden */}
                    {h.changedBy && (
                      <div className="text-xs text-muted-foreground">
                        von <span className="font-mono">{h.changedBy.slice(0, 8)}…</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">Status:</span>
                    <LeadStatusBadge status={h.fromStatus ?? "new"} />
                    <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                    <LeadStatusBadge status={h.toStatus} />
                    {/* Menschliche Beschreibung */}
                    <span className="text-xs text-muted-foreground">
                      {LEAD_STATUS_LABEL[h.fromStatus ?? "new"]} → {LEAD_STATUS_LABEL[h.toStatus]}
                    </span>
                  </div>
                </div>
              </li>
            ))}
            {isLoading && (
              <li className="pl-6">
                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  Lädt …
                </div>
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}
