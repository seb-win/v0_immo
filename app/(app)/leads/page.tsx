"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ListToolbar from "@/components/leads/list-toolbar";
import LeadFilters from "@/components/leads/lead-filters";
import LeadTable from "@/components/leads/lead-table";
import NewLeadDialog from "@/components/leads/new-lead-dialog";
import type { Lead, LeadStatus, SortSpec } from "@/lib/types/lead";
import { LEAD_STATUS_LABEL } from "@/lib/types/lead";
import { listLeads } from "@/lib/repositories/leads-repo";

/* ------------------- Page wrapper with Suspense ------------------- */

export default function LeadsPage() {
  return (
    <Suspense fallback={<LeadsPageSkeleton />}>
      <LeadsPageContent />
    </Suspense>
  );
}

function LeadsPageSkeleton() {
  return (
    <div className="space-y-3 md:space-y-4">
      <div className="h-14 rounded-md border bg-muted/40 animate-pulse" />
      <div className="h-24 rounded-md border bg-muted/40 animate-pulse" />
      <div className="h-72 rounded-md border bg-muted/40 animate-pulse" />
    </div>
  );
}

/* ------------------- Actual page content (URL-driven) --------------- */

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;

type FiltersState = {
  q?: string;
  statuses?: LeadStatus[];
  dateFrom?: string; // ISO
  dateTo?: string;   // ISO
};

function LeadsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 👇 Alle Steuerwerte rein aus der URL ableiten (keine lokalen Mirror-States)
  const filters: FiltersState = useMemo(() => readFiltersFromURL(searchParams), [searchParams]);
  const page = useMemo(() => readNumber(searchParams.get("page")) ?? DEFAULT_PAGE, [searchParams]);
  const pageSize = DEFAULT_PAGE_SIZE; // (konstant – UI zum Ändern fehlt aktuell)
  const sort = useMemo(() => readSort(searchParams.get("sort")), [searchParams]);

  const [rows, setRows] = useState<Lead[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  // Daten laden, sobald URL-getriebene Steuerwerte sich ändern
  useEffect(() => {
    let alive = true;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, total: t } = await listLeads({
          ...filters,
          page,
          pageSize,
          sort,
        });
        if (!alive) return;
        setRows(data);
        setTotal(t);
      } catch (err) {
        if (!alive) return;
        const msg = err instanceof Error ? err.message : "Unbekannter Fehler beim Laden der Leads.";
        setError(msg);
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [filters, page, pageSize, sort]);

  // Nur dann die URL ändern, wenn sich die Query wirklich ändert
  const updateURL = useCallback((next: {
    filters?: FiltersState;
    page?: number;
    sort?: SortSpec | undefined;
  }) => {
    const sp = new URLSearchParams();

    const f = next.filters ?? filters;
    if (f.q) sp.set("q", f.q);
    (f.statuses ?? []).forEach((s) => sp.append("status", s));
    if (f.dateFrom) sp.set("from", f.dateFrom);
    if (f.dateTo) sp.set("to", f.dateTo);

    const p = next.page ?? page;
    if (p && p !== DEFAULT_PAGE) sp.set("page", String(p));

    if (pageSize && pageSize !== DEFAULT_PAGE_SIZE) sp.set("pageSize", String(pageSize));

    const s = next.sort ?? sort;
    if (s) sp.set("sort", `${s.field}:${s.direction}`);

    const qs = sp.toString();
    const prevQs = searchParams.toString();
    if (qs === prevQs) return; // ✅ vermeidet Ping-Pong

    router.replace(qs ? `/leads?${qs}` : "/leads", { scroll: false });
  }, [filters, page, pageSize, sort, router, searchParams]);

  /* ------------------------- Handlers ------------------------- */

  const handleFiltersChange = (f: FiltersState) => {
    // Filter ändern → immer Seite 1
    updateURL({ filters: f, page: 1 });
  };

  const handleClearAll = () => {
    updateURL({ filters: {}, page: 1, sort: undefined });
  };

  const handleSort = (next: SortSpec) => {
    updateURL({ sort: next, page: 1 });
  };

  const handlePageChange = (p: number) => {
    updateURL({ page: p });
  };

  const handleCreated = () => {
    setNewOpen(false);
    updateURL({ page: 1 }); // nach Anlage zurück zu Seite 1 & neu laden
  };

  /* ------------------------- Chips aus URL ------------------------- */

  const chips = useMemo(() => {
    const items: { id: string; label: string; onClear?: () => void }[] = [];

    if (filters.q) {
      items.push({
        id: "q",
        label: `Suche: ${filters.q}`,
        onClear: () => handleFiltersChange({ ...filters, q: undefined }),
      });
    }
    if (filters.statuses?.length) {
      for (const s of filters.statuses) {
        items.push({
          id: `status:${s}`,
          label: `Status: ${LEAD_STATUS_LABEL[s]}`,
          onClear: () =>
            handleFiltersChange({
              ...filters,
              statuses: (filters.statuses ?? []).filter((x) => x !== s),
            }),
        });
      }
    }
    if (filters.dateFrom) {
      items.push({
        id: "from",
        label: `Von: ${formatDateChip(filters.dateFrom)}`,
        onClear: () => handleFiltersChange({ ...filters, dateFrom: undefined }),
      });
    }
    if (filters.dateTo) {
      items.push({
        id: "to",
        label: `Bis: ${formatDateChip(filters.dateTo)}`,
        onClear: () => handleFiltersChange({ ...filters, dateTo: undefined }),
      });
    }
    return items;
  }, [filters]);

  return (
    <div className="space-y-3 md:space-y-4">
      <ListToolbar
        title="Leads"
        total={total}
        chips={chips}
        onClearAll={chips.length ? handleClearAll : undefined}
        onNewLead={() => setNewOpen(true)}
      />

      <LeadFilters
        defaultQ={filters.q}
        defaultStatuses={filters.statuses}
        defaultDateFrom={filters.dateFrom}
        defaultDateTo={filters.dateTo}
        onChange={handleFiltersChange}
        onClearAll={handleClearAll}
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <LeadTable
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        sort={sort}
        onSort={handleSort}
        onPageChange={handlePageChange}
        isLoading={isLoading}
      />

      <NewLeadDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}

/* ------------------------------ Helpers ------------------------------ */

function readNumber(v: string | null): number | undefined {
  if (!v) return;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function readSort(input: string | null): SortSpec | undefined {
  if (!input) return;
  const [field, direction] = input.split(":");
  if (!field || !direction) return;
  if (!["asc", "desc"].includes(direction)) return;
  const allowed = new Set(["created_at", "full_name", "status", "city", "postal_code"]);
  if (!allowed.has(field)) return;
  return { field: field as SortSpec["field"], direction: direction as SortSpec["direction"] };
}

function readFiltersFromURL(sp: ReturnType<typeof useSearchParams>): FiltersState {
  const q = sp.get("q") ?? undefined;
  const statuses = sp.getAll("status") as LeadStatus[];
  const dateFrom = sp.get("from") ?? undefined;
  const dateTo = sp.get("to") ?? undefined;
  return { q, statuses: statuses.length ? statuses : undefined, dateFrom, dateTo };
}

function formatDateChip(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("de-DE", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}
