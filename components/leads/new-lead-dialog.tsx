"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { Lead } from "@/lib/types/lead";
import { createLead } from "@/lib/repositories/leads-repo";
import {
  createLeadSchema,
  type CreateLeadInput,
} from "@/lib/validation/lead";

type NewLeadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Wird bei erfolgreichem Anlegen aufgerufen */
  onCreated?: (lead: Lead) => void;
};

type FieldErrors = Partial<Record<keyof CreateLeadInput, string>> & {
  _root?: string;
};

const initialForm: CreateLeadInput = {
  fullName: "",
  street: "",
  postalCode: "",
  city: "",
  email: undefined,
  phone: undefined,
  source: undefined,
  notes: undefined,
};

export default function NewLeadDialog({
  open,
  onOpenChange,
  onCreated,
}: NewLeadDialogProps) {
  const [form, setForm] = useState<CreateLeadInput>(initialForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(initialForm);
      setErrors({});
      setIsSubmitting(false);
    }
  }, [open]);

  const setField = useCallback(
    <K extends keyof CreateLeadInput>(key: K, value: CreateLeadInput[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      if (errors[key]) {
        setErrors((e) => ({ ...e, [key]: undefined })); // Feld-Fehler leeren bei Eingabe
      }
      if (errors._root) setErrors((e) => ({ ...e, _root: undefined }));
    },
    [errors]
  );

  const canSubmit = useMemo(() => {
    // Minimale Check vorab (UI)
    return (
      !!form.fullName?.trim() &&
      !!form.street?.trim() &&
      !!form.postalCode?.trim() &&
      !!form.city?.trim() &&
      !isSubmitting
    );
  }, [form, isSubmitting]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setErrors({});

    // Client-Validierung (Zod)
    const parsed = createLeadSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path?.[0] as keyof CreateLeadInput | undefined;
        if (path) {
          fieldErrs[path] = issue.message;
        } else {
          fieldErrs._root = issue.message;
        }
      }
      setErrors(fieldErrs);
      return;
    }

    try {
      setIsSubmitting(true);
      const newLead = await createLead(parsed.data);
      onCreated?.(newLead);
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler beim Anlegen.";
      setErrors({ _root: msg });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="new-lead-desc" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Neuen Lead anlegen</DialogTitle>
          <DialogDescription id="new-lead-desc">
            Pflichtfelder: Name, Straße, PLZ, Ort. Status wird automatisch auf <strong>Neu</strong> gesetzt.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="grid gap-1.5">
            <Label htmlFor="fullName">Name</Label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(e) => setField("fullName", e.target.value)}
              placeholder="Max Mustermann"
              autoFocus
            />
            {errors.fullName && (
              <p className="text-xs text-destructive">{errors.fullName}</p>
            )}
          </div>

          {/* Adresse */}
          <div className="grid gap-1.5">
            <Label htmlFor="street">Straße</Label>
            <Input
              id="street"
              value={form.street}
              onChange={(e) => setField("street", e.target.value)}
              placeholder="Musterstraße 1"
            />
            {errors.street && (
              <p className="text-xs text-destructive">{errors.street}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="postalCode">PLZ</Label>
              <Input
                id="postalCode"
                inputMode="numeric"
                value={form.postalCode}
                onChange={(e) => setField("postalCode", e.target.value)}
                placeholder="10115"
              />
              {errors.postalCode && (
                <p className="text-xs text-destructive">{errors.postalCode}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="city">Ort</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => setField("city", e.target.value)}
                placeholder="Berlin"
              />
              {errors.city && (
                <p className="text-xs text-destructive">{errors.city}</p>
              )}
            </div>
          </div>

          {/* Optional: Kontakt */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="email">E-Mail (optional)</Label>
              <Input
                id="email"
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setField("email", e.target.value || undefined)}
                placeholder="max@example.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="phone">Telefon (optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone ?? ""}
                onChange={(e) => setField("phone", e.target.value || undefined)}
                placeholder="+49 30 1234567"
                autoComplete="tel"
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Optional: Quelle & Notiz */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="source">Quelle (optional)</Label>
              <Input
                id="source"
                value={form.source ?? ""}
                onChange={(e) => setField("source", e.target.value || undefined)}
                placeholder="Portal, Empfehlung, …"
              />
              {errors.source && (
                <p className="text-xs text-destructive">{errors.source}</p>
              )}
            </div>

            <div className="grid gap-1.5 col-span-2 sm:col-span-1 sm:col-start-2 hidden" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notiz (optional)</Label>
            <Textarea
              id="notes"
              value={form.notes ?? ""}
              onChange={(e) => setField("notes", e.target.value || undefined)}
              placeholder="Kurz vermerken, warum/womit kontaktiert wurde …"
              rows={3}
            />
            {errors.notes && (
              <p className="text-xs text-destructive">{errors.notes}</p>
            )}
          </div>

          {/* Root-Error */}
          {errors._root && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errors._root}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Anlegen …
                </>
              ) : (
                "Lead anlegen"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
