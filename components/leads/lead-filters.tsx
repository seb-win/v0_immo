"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Filter, ChevronDown, Check, X, Calendar as CalendarIcon, Search } from "lucide-react";
import type { LeadStatus } from "@/lib/types/lead";
import { LEAD_STATUSES, LEAD_STATUS_LABEL } from "@/lib/types/lead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LeadFiltersChange = {
  q?: string;
  statuses?: LeadStatus[];
  dateFrom?: string; // ISO
  dateTo?: string;   // ISO
};

type LeadFiltersProps = {
  /** Initialwerte (optional) */
  defaultQ?: string;
  defaultStatuses?: LeadStatus[];
  defaultDateFrom?: string | Date;
  defaultDateTo?: string | Date;
  /** Callback bei Änderungen */
  onChange: (filters: LeadFiltersChange) => void;
  /** Optionaler "Alles zurücksetzen"-Handler auf der Seite */
  onClearAll?: () => void;
  /** Debounce für Suche (ms) – Standard 300 */
  debounceMs?: number;
  className?: string;
};

/* --------------------------------- Helpers -------------------------------- */

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

function toISO(input?: string | Date): string | undefined {
  if (!input) return undefined;
  if (input instanceof Date) return input.toISOString();
  // already ISO?
  if (/^\d{4}-\d{2}-\d{2}T/.test(input)) return input;
  // interpret as date-only (yyyy-mm-dd), convert to start-of-day UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return new Date(input + "T00:00:00.000Z").toISOString();
  const d = new Date(input);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** date-only (yyyy-mm-dd) aus ISO */
function toDateOnly(iso?: string | Date): string | undefined {
  if (!iso) return undefined;
  const d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d.getTime())) return undefined;
  // yyyy-mm-dd (lokal egal, wir zeigen nur Datum)
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDayISO(dateOnly: string): string {
  return new Date(dateOnly + "T00:00:00.000Z").toISOString();
}
function endOfDayISO(dateOnly: string): string {
  return new Date(dateOnly + "T23:59:59.999Z").toISOString();
}

/* -------------------------------- Component -------------------------------- */

export default function LeadFilters({
  defaultQ,
  defaultStatuses,
  defaultDateFrom,
  defaultDateTo,
  onChange,
  onClearAll,
  debounceMs = 300,
  className,
}: LeadFiltersProps) {
  // Local state
  const [q, setQ] = useState<string>(defaultQ ?? "");
  const [statusOpen, setStatusOpen] = useState(false);
  const [selected, setSelected] = useState<LeadStatus[]>(defaultStatuses ?? []);
  const [dateFrom, setDateFrom] = useState<string | undefined>(() => toDateOnly(defaultDateFrom));
  const [dateTo, setDateTo] = useState<string | undefined>(() => toDateOnly(defaultDateTo));

  // Debounce search
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      emitChange();
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Emit when filters (other than q) change
  useEffect(() => {
    emitChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, dateFrom, dateTo]);

  const selectedCount = selected.length;
  const selectedLabel = useMemo(() => {
    if (selectedCount === 0) return "Alle Status";
    if (selectedCount === 1) return LEAD_STATUS_LABEL[selected[0]];
    return `${selectedCount} ausgewählt`;
  }, [selectedCount, selected]);

  function toggleStatus(s: LeadStatus) {
    setSelected((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function clearStatuses() {
    setSelected([]);
  }

  function resetAll() {
    setQ("");
    setSelected([]);
    setDateFrom(undefined);
    setDateTo(undefined);
    onClearAll?.();
    // emitChange() wird durch useEffect getriggert
  }

  function emitChange() {
    const payload: LeadFiltersChange = {
      q: q.trim() ? q.trim() : undefined,
      statuses: selected.length > 0 ? selected : undefined,
      dateFrom: dateFrom ? startOfDayISO(dateFrom) : undefined,
      dateTo: dateTo ? endOfDayISO(dateTo) : undefined,
    };
    onChange(payload);
  }

  return (
    <div className={cx("rounded-md border bg-card p-3 md:p-4", className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche: Name, Adresse, PLZ, Ort…"
            className="pl-8"
            aria-label="Leads durchsuchen"
          />
        </div>

        {/* Status Dropdown (simple popover) */}
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            className="inline-flex items-center gap-2"
            onClick={() => setStatusOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={statusOpen}
            aria-controls="status-menu"
          >
            <Filter className="h-4 w-4" />
            <span>{selectedLabel}</span>
            <ChevronDown className="h-4 w-4 opacity-70" />
          </Button>

          {statusOpen && (
            <div
              id="status-menu"
              role="menu"
              aria-label="Status filtern"
              className="absolute z-20 mt-2 w-56 rounded-md border bg-popover p-2 shadow-md"
            >
              <div className="max-h-64 overflow-auto pr-1">
                {LEAD_STATUSES.map((s) => {
                  const active = selected.includes(s);
                  return (
                    <button
                      key={s}
                      role="menuitemcheckbox"
                      aria-checked={active}
                      type="button"
                      onClick={() => toggleStatus(s)}
                      className={cx(
                        "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm",
                        active ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <span>{LEAD_STATUS_LABEL[s]}</span>
                      {active && <Check className="h-4 w-4" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearStatuses}
                  className="gap-1"
                >
                  <X className="h-4 w-4" />
                  Zurücksetzen
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setStatusOpen(false)}
                >
                  Anwenden
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <CalendarIcon className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={dateFrom ?? ""}
              onChange={(e) => setDateFrom(e.target.value || undefined)}
              className="pl-8 min-w-[10.5rem]"
              aria-label="Datum von"
            />
          </div>
          <span className="text-muted-foreground">–</span>
          <div className="relative">
            <CalendarIcon className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={dateTo ?? ""}
              onChange={(e) => setDateTo(e.target.value || undefined)}
              className="pl-8 min-w-[10.5rem]"
              aria-label="Datum bis"
            />
          </div>
        </div>

        {/* Clear all */}
        <div className="md:ml-auto">
          <Button
            type="button"
            variant="ghost"
            onClick={resetAll}
            className="gap-2"
            aria-label="Alle Filter zurücksetzen"
          >
            <X className="h-4 w-4" />
            Alle Filter löschen
          </Button>
        </div>
      </div>
    </div>
  );
}
