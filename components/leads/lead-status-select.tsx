"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import type { LeadStatus } from "@/lib/types/lead";
import { LEAD_STATUSES, LEAD_STATUS_LABEL } from "@/lib/types/lead";
import LeadStatusBadge from "./lead-status-badge";
import { updateStatus } from "@/lib/repositories/leads-repo";

type LeadStatusSelectProps = {
  leadId: string;
  /** Aktueller Status (vom Server) */
  value: LeadStatus;
  /** Wird nach erfolgreichem Update aufgerufen */
  onChanged?: (next: LeadStatus) => void;
  /** Deaktiviert den Control */
  disabled?: boolean;
  className?: string;
};

/**
 * LeadStatusSelect
 * - Dropdown zum Ändern des Status mit Optimistic-UI und Fehlerrückmeldung.
 * - Nutzt LeadStatusBadge für konsistente Darstellung.
 */
export default function LeadStatusSelect({
  leadId,
  value,
  onChanged,
  disabled,
  className,
}: LeadStatusSelectProps) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<LeadStatus>(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prop-Änderungen übernehmen (falls extern aktualisiert)
  useEffect(() => {
    setCurrent(value);
  }, [value]);

  async function handleSelect(next: LeadStatus) {
    if (next === current || isSaving || disabled) {
      setOpen(false);
      return;
    }
    setError(null);
    setIsSaving(true);
    const prev = current;
    setCurrent(next); // optimistic

    try {
      await updateStatus({ leadId, toStatus: next });
      onChanged?.(next);
    } catch (e) {
      // rollback
      setCurrent(prev);
      const msg =
        e instanceof Error ? e.message : "Status konnte nicht geändert werden.";
      setError(msg);
    } finally {
      setIsSaving(false);
      setOpen(false);
    }
  }

  return (
    <div className={["inline-flex flex-col gap-1", className].filter(Boolean).join(" ")}>
      <div className="text-xs font-medium text-muted-foreground">Status</div>

      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && !isSaving && setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls="status-select-menu"
          aria-busy={isSaving}
          className={[
            "inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm",
            "hover:bg-accent hover:text-accent-foreground",
            disabled ? "opacity-60 cursor-not-allowed" : "",
          ].join(" ")}
        >
          <LeadStatusBadge status={current} withDot />
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 opacity-70" aria-hidden />
          )}
        </button>

        {open && (
          <div
            id="status-select-menu"
            role="menu"
            aria-label="Lead-Status auswählen"
            className="absolute right-0 z-30 mt-2 w-56 rounded-md border bg-popover p-1 shadow-md"
          >
            {LEAD_STATUSES.map((s) => {
              const active = s === current;
              return (
                <button
                  key={s}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => handleSelect(s)}
                  className={[
                    "flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm",
                    active ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground",
                  ].join(" ")}
                >
                  <span className="inline-flex items-center gap-2">
                    <LeadStatusBadge status={s} withDot />
                    <span>{LEAD_STATUS_LABEL[s]}</span>
                  </span>
                  {active && <Check className="h-4 w-4" aria-hidden />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <div className="text-xs text-destructive">{error}</div>
      )}
    </div>
  );
}
