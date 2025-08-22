"use client";

import type { LeadStatus } from "@/lib/types/lead";
import { LEAD_STATUS_LABEL } from "@/lib/types/lead";

/**
 * LeadStatusBadge
 * - Konsistente Anzeige der Lead-Statuswerte mit Farbe & optionalem Dot.
 * - Keine Abhängigkeit zu shadcn/ui nötig (reines Tailwind).
 */

type LeadStatusBadgeProps = {
  status: LeadStatus;
  className?: string;
  withDot?: boolean;
  uppercase?: boolean;
  titleAttr?: string; // optionales Title-Attribut (Tooltip)
};

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const STATUS_STYLES: Record<
  LeadStatus,
  { bg: string; text: string; border: string; dot: string }
> = {
  new: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  contacted: {
    bg: "bg-amber-100",
    text: "text-amber-800",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  qualified: {
    bg: "bg-violet-100",
    text: "text-violet-800",
    border: "border-violet-200",
    dot: "bg-violet-500",
  },
  converted: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-200",
    dot: "bg-green-500",
  },
  archived: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-200",
    dot: "bg-gray-500",
  },
};

export default function LeadStatusBadge({
  status,
  className,
  withDot = true,
  uppercase = false,
  titleAttr,
}: LeadStatusBadgeProps) {
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES["archived"];
  const labelBase = LEAD_STATUS_LABEL[status] ?? status;
  const label = uppercase ? labelBase.toUpperCase() : labelBase;

  return (
    <span
      className={cx(
        "inline-flex select-none items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
        styles.bg,
        styles.text,
        styles.border,
        className
      )}
      aria-label={`Status: ${label}`}
      title={titleAttr ?? label}
      data-status={status}
    >
      {withDot && (
        <span
          aria-hidden
          className={cx("h-1.5 w-1.5 rounded-full", styles.dot)}
        />
      )}
      <span>{label}</span>
    </span>
  );
}
