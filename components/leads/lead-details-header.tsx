"use client";

import type { Lead } from "@/lib/types/lead";
import LeadStatusBadge from "./lead-status-badge";

type LeadDetailsHeaderProps = {
  lead: Lead;
  /** Optional: eigenes Element auf der rechten Seite einblenden (z. B. Status-Select) */
  rightSlot?: React.ReactNode;
  className?: string;
};

const cx = (...c: Array<string | false | null | undefined>) =>
  c.filter(Boolean).join(" ");

function formatAddress(lead: Lead) {
  if (lead.addressText) return lead.addressText;
  const parts = [lead.street, lead.postalCode, lead.city].filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 3) return `${parts[0]}, ${parts[1]} ${parts[2]}`;
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

export default function LeadDetailsHeader({
  lead,
  rightSlot,
  className,
}: LeadDetailsHeaderProps) {
  const address = formatAddress(lead);
  const created = formatDateTime(lead.createdAt);

  return (
    <section
      className={cx(
        "rounded-md border bg-card px-4 py-4 md:px-5 md:py-5",
        className
      )}
      aria-label="Lead Kopfbereich"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        {/* Left: Title + meta */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold leading-tight">
              {lead.fullName || "Unbenannter Lead"}
            </h1>
            {/* Fallback: Badge anzeigen, falls kein rightSlot gesetzt wurde */}
            {!rightSlot && <LeadStatusBadge status={lead.status} />}
          </div>

          <div className="text-sm text-muted-foreground">
            <div className="truncate">
              <span className="font-medium text-foreground">Adresse: </span>
              {address}
            </div>
            <div>
              <span className="font-medium text-foreground">Eingegangen am: </span>
              {created}
            </div>
          </div>

          {/* Kontaktinfos (optional) */}
          {(lead.email || lead.phone) && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-sm">
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="rounded-full border px-2.5 py-0.5 text-xs hover:bg-accent hover:text-accent-foreground"
                >
                  {lead.email}
                </a>
              )}
              {lead.phone && (
                <a
                  href={`tel:${lead.phone.replace(/\s+/g, "")}`}
                  className="rounded-full border px-2.5 py-0.5 text-xs hover:bg-accent hover:text-accent-foreground"
                >
                  {lead.phone}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Right: Slot für z. B. Status-Select */}
        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>
    </section>
  );
}
