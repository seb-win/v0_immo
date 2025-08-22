"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquarePlus, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { LeadNote } from "@/lib/types/lead";
import { addNote, listNotes } from "@/lib/repositories/leads-repo";

/**
 * LeadNotes
 * - Zeigt Notizen (append-only) und Eingabe zum Hinzufügen.
 * - Lädt initial die neuesten Notizen; nach Submit wird die Liste sofort aktualisiert.
 */

type LeadNotesProps = {
  leadId: string;
  className?: string;
  allowAdd?: boolean; // Eingabe-Form anzeigen (default: true)
  onAdded?: (note: LeadNote) => void; // Callback nach erfolgreichem Hinzufügen
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

export default function LeadNotes({
  leadId,
  className,
  allowAdd = true,
  onAdded,
}: LeadNotesProps) {
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const count = notes.length;

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await listNotes(leadId);
      setNotes(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Notizen konnten nicht geladen werden.";
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    load();
  }, [load]);

  const canSubmit = useMemo(() => {
    return !!draft.trim() && !isSubmitting;
  }, [draft, isSubmitting]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setSubmitError(null);
    const body = draft.trim();
    if (!body) return;

    setIsSubmitting(true);
    try {
      const note = await addNote({ leadId, body });
      // Vorne einfügen (wir zeigen jüngste zuerst)
      setNotes((prev) => [note, ...prev]);
      setDraft("");
      onAdded?.(note);
      // Fokus zurück in das Textfeld
      const ta = formRef.current?.querySelector("textarea") as HTMLTextAreaElement | null;
      ta?.focus();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Notiz konnte nicht gespeichert werden.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Ctrl/Cmd + Enter sendet ab
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && canSubmit) {
      e.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <section className={cx("rounded-md border bg-card", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Notizen</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{count}</span>
        </div>

        {isLoading && (
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Laden …
          </div>
        )}
      </div>

      {/* Form */}
      {allowAdd && (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-2 px-4 pt-4">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Neue Notiz hinzufügen … (Strg/⌘ + Enter zum Speichern)"
            rows={3}
          />
          {submitError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {submitError}
            </div>
          )}
          <div className="flex items-center justify-end pb-2">
            <Button type="submit" disabled={!canSubmit} className="gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Notiz speichern
            </Button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="px-4 pb-4">
        {loadError ? (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {loadError}
          </div>
        ) : notes.length === 0 && !isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Keine Notizen vorhanden.</div>
        ) : (
          <ul className="space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="rounded-md border p-3">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Erstellt:</span>{" "}
                    {formatDateTime(n.createdAt)}
                  </div>
                  {/* Platzhalter für zukünftige Features (z. B. Autorname) */}
                  {/* <div className="text-xs text-muted-foreground">von {n.authorId?.slice(0, 8)}…</div> */}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
