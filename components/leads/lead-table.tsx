"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Eye } from "lucide-react";
import type { Lead, SortSpec } from "@/lib/types/lead";
import LeadStatusBadge from "./lead-status-badge";

type LeadTableProps = {
  rows: Lead[];
  total: number;
  /** 1-basiert */
  page: number;
  pageSize: number;
  sort?: SortSpec;
  onSort?: (next: SortSpec) => void;
  onPageChange?: (page: number) => void;
  isLoading?: boolean;
  className?: string;
};

type SortableField = Extract<SortSpec["field"], "full_name" | "city" | "created_at" | "status">;

const SORTABLE_COLUMNS: { key: SortableField; label: string }[] = [
  { key: "full_name", label: "Name" },
  { key: "city", label: "Ort" },               // sortiert nach city
  { key: "created_at", label: "Eingegangen am" },
  { key: "status", label: "Status" },
];

function formatLocation(lead: Lead) {
  // 1) addressText bevorzugen (falls vorhanden – enthält i.d.R. Straße + Hausnr.)
  if (lead.addressText && lead.addressText.trim()) return lead.addressText.trim();

  // 2) Fallback: street, postalCode city
  const parts: string[] = [];
  if (lead.street) parts.push(lead.street);
  const cityParts = [lead.postalCode, lead.city].filter(Boolean).join(" ");
  if (cityParts) parts.push(cityParts);

  if (parts.length === 0) return "—";
  return parts.join(", ");
}

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

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: SortSpec["direction"] | undefined;
}) {
  if (!active) return <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />;
  return direction === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5" />
  );
}

export default function LeadTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  onSort,
  onPageChange,
  isLoading,
  className,
}: LeadTableProps) {
  const from = useMemo(() => (total === 0 ? 0 : (page - 1) * pageSize + 1), [page, pageSize, total]);
  const to = useMemo(() => Math.min(page * pageSize, total), [page, pageSize, total]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 0) / pageSize)), [total, pageSize]);

  const handleHeaderClick = (field: SortableField) => {
    if (!onSort) return;
    if (sort?.field === field) {
      const nextDir = sort.direction === "asc" ? "desc" : "asc";
      onSort({ field, direction: nextDir });
    } else {
      onSort({ field, direction: "asc" });
    }
  };

  return (
    <div className={["rounded-lg border bg-card", className].filter(Boolean).join(" ")}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="[&>th]:whitespace-nowrap [&>th]:px-4 [&>th]:py-2 [&>th]:text-left">
              {SORTABLE_COLUMNS.map(({ key, label }) => {
                const active = sort?.field === key;
                return (
                  <th key={key}>
                    <button
                      type="button"
                      onClick={() => handleHeaderClick(key)}
                      className="inline-flex items-center gap-1 font-medium hover:underline"
                    >
                      {label}
                      <SortIcon active={!!active} direction={active ? sort?.direction : undefined} />
                    </button>
                  </th>
                );
              })}
              <th className="px-4 py-2 text-right">Aktion</th>
            </tr>
          </thead>

          <tbody className="[&>tr>td]:px-4 [&>tr>td]:py-3">
            {isLoading ? (
              <tr>
                <td colSpan={SORTABLE_COLUMNS.length + 1}>
                  <div className="animate-pulse py-4 text-center text-muted-foreground">Lade Leads …</div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={SORTABLE_COLUMNS.length + 1}>
                  <div className="py-8 text-center text-muted-foreground">Keine Leads gefunden.</div>
                </td>
              </tr>
            ) : (
              rows.map((lead) => (
                <tr key={lead.id} className="border-t">
                  <td className="font-medium">{lead.fullName || "—"}</td>
                  <td>{formatLocation(lead)}</td>
                  <td>{formatDateTime(lead.createdAt)}</td>
                  <td>
                    <LeadStatusBadge status={lead.status} />
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Details
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: Pagination + Range */}
      <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
        <div>
          {total > 0 ? (
            <span>
              Zeige <span className="font-medium text-foreground">{from}</span>–
              <span className="font-medium text-foreground">{to}</span> von{" "}
              <span className="font-medium text-foreground">{total}</span>
            </span>
          ) : (
            <span>0 Einträge</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange && onPageChange(page - 1)}
            className="inline-flex items-center rounded-md border px-2.5 py-1.5 disabled:opacity-50"
            aria-label="Vorherige Seite"
          >
            ← Zurück
          </button>
          <span>
            Seite <span className="font-medium text-foreground">{page}</span> / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || isLoading}
            onClick={() => onPageChange && onPageChange(page + 1)}
            className="inline-flex items-center rounded-md border px-2.5 py-1.5 disabled:opacity-50"
            aria-label="Nächste Seite"
          >
            Weiter →
          </button>
        </div>
      </div>
    </div>
  );
}
