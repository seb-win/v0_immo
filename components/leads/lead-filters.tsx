"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Filter, ChevronDown, Check, Calendar as CalendarIcon, Search } from "lucide-react";
import type { LeadStatus } from "@/lib/types/lead";
import { LEAD_STATUSES, LEAD_STATUS_LABEL } from "@/lib/types/lead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LeadStatusBadge from "@/components/leads/lead-status-badge";

type LeadFiltersChange = {
  q?: string;
  statuses?: LeadStatus[];
  dateFrom?: string; // ISO
  dateTo?: string;   // ISO
};

type LeadFiltersProps = {
  defaultQ?: string;
  defaultStatuses?: LeadStatus[];
  defaultDateFrom?: string | Date;
  defaultDateTo?: string | Date;
  onChange: (filters: LeadFiltersChange) => void;
  onClearAll?: () => void;
  debounceMs?: number;
  className?: string;
};

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

function toDateOnly(iso?: string | Date): string | undefined {
  if (!iso) return undefined;
  const d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d.getTime())) return undefined;
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
  const [q, setQ] = useState<string>(defaultQ ?? "");
  const [statusOpen, setStatusOpen] = useState(false);
  const [selected, setSelected] = useState<LeadStatus[]>(defaultStatuses ?? []);
  const [dateFrom, setDateFrom] = useState<string | undefined>(() => toDateOnly(defaultDateFrom));
  const [dateTo, setDateTo] = useState<string | undefined>(() => toDateOnly(defaultDateTo));

  // Refs für Outside-Click
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Initial-Emit verhindern (beugt Ping-Pong vor)
  const firstRef = useRef(true);

  // Debounced Suche
  useEffect(() => {
    const t = setTimeout(() => {
      if (firstRef.current) {
        firstRef.current = false;
        return;
      }
      emitChange();
    }, debounceMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Emit bei Status/Datum – außer beim allerersten Mount
  useEffect(() => {
    if (firstRef.current) return;
    emitChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, dateFrom, dateTo]);

  // Outside click schließt das Menü
  useEffect(() => {
    if (!statusOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (btnRef.current?.contains(target)) return;
      setStatusOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStatusOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [statusOpen]);

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
    // kein „Anwenden“ nötig – emitChange kommt durch useEffect
  }

  function resetAll() {
    setQ("");
    setSelected([]);
    setDateFrom(undefined);
    setDateTo(undefined);
    onClearAll?.();
    // emitChange folgt automatisch (nicht initial)
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
        {/* Suche */}
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

        {/* Status Dropdown – ohne Zurücksetzen/Anwenden */}
        <div className="relative">
          <Button
            ref={btnRef}
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
              ref={menuRef}
              role="menu"
              aria-label="Status filtern"
              className="absolute z-20 mt-2 w-64 rounded-md border bg-popover p-2 shadow-md"
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
                        "flex w-full items-center justify-between rounded-sm px-2 py-2 text-sm",
                        active ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <span className="inline-flex items-center gap-2">
                        {/* Farbigkeit exakt wie in der Tabelle */}
                        <LeadStatusBadge status={s} />
                        <span>{LEAD_STATUS_LABEL[s]}</span>
                      </span>
                      {active && <Check className="h-4 w-4" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Datumsbereich */}
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

        {/* Alle Filter löschen (global, außerhalb des Popups) */}
        <div className="md:ml-auto">
          <Button
            type="button"
            variant="ghost"
            onClick={resetAll}
            className="gap-2"
            aria-label="Alle Filter zurücksetzen"
          >
            {/* kleines „x“ optional – du kannst es beibehalten oder entfernen */}
            {/* <X className="h-4 w-4" /> */}
            Alle Filter löschen
          </Button>
        </div>
      </div>
    </div>
  );
}
