"use client";

import { Plus, X, FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";

type FilterChip = {
  /** Stabile ID für React-Keys */
  id: string;
  /** Sichtbares Label, z. B. "Status: contacted" */
  label: string;
  /** Optional: Callback zum Entfernen dieses Chips */
  onClear?: () => void;
};

type ListToolbarProps = {
  /** Überschrift links – kann auf der Seite überschrieben werden */
  title?: string;
  /** Gesamtanzahl Treffer (optional, für Zähler) */
  total?: number;
  /** Aktive Filterchips (optional) */
  chips?: FilterChip[];
  /** Optional: Alle Filter zurücksetzen */
  onClearAll?: () => void;
  /** „Neuer Lead“ klicken → öffnet Dialog */
  onNewLead: () => void;
  /** Während Erstellung laden/disabled */
  isCreating?: boolean;
  className?: string;
};

const cx = (...c: Array<string | false | null | undefined>) =>
  c.filter(Boolean).join(" ");

export default function ListToolbar({
  title = "Leads",
  total,
  chips = [],
  onClearAll,
  onNewLead,
  isCreating,
  className,
}: ListToolbarProps) {
  const hasChips = chips.length > 0;

  return (
    <div
      className={cx(
        "rounded-md border bg-card px-4 py-3 md:px-5 md:py-4",
        className
      )}
    >
      {/* Top row: Title + actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold leading-none tracking-tight">
            {title}
          </h2>
          {typeof total === "number" && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              {Intl.NumberFormat("de-DE").format(total)} Einträge
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasChips && onClearAll && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearAll}
              className="gap-2"
              aria-label="Alle Filter zurücksetzen"
            >
              <FilterX className="h-4 w-4" />
              Filter zurücksetzen
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={onNewLead}
            disabled={isCreating}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Neuer Lead
          </Button>
        </div>
      </div>

      {/* Chips row */}
      {hasChips && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <span
              key={chip.id}
              className={cx(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs",
                "bg-accent text-accent-foreground"
              )}
              title={chip.label}
            >
              <span className="truncate max-w-[18ch]">{chip.label}</span>
              {chip.onClear && (
                <button
                  type="button"
                  onClick={chip.onClear}
                  className="ml-1 rounded-full p-0.5 hover:bg-background/50"
                  aria-label={`Filter entfernen: ${chip.label}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
