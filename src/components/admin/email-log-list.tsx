"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { EmailLogRow } from "@/lib/db/email-log";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmailResend } from "@/components/admin/email-resend";
import { deleteEmailLogAction } from "@/actions/admin-booking";
import { formatHumanDateTime } from "@/lib/time";

const CHECKBOX =
  "h-4 w-4 cursor-pointer rounded border-input accent-primary";

function variant(
  status: string,
): "default" | "secondary" | "destructive" {
  if (status === "sent") return "default";
  if (status === "failed") return "destructive";
  return "secondary";
}

/** E-mail log with multi-select delete. */
export function EmailLogList({ rows }: { rows: EmailLogRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pending, startTransition] = useTransition();

  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)),
    );
  }

  function deleteSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    startTransition(async () => {
      const r = await deleteEmailLogAction(ids);
      if (r.ok) {
        toast.success(`${r.deleted ?? 0} e-mail(s) verwijderd`);
        setSelected(new Set());
        router.refresh();
      } else {
        toast.error("Verwijderen mislukt.");
      }
    });
  }

  return (
    <div className="mt-6">
      <div
        className={
          "flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5 " +
          (selected.size > 0
            ? "border-primary/40 bg-primary/5"
            : "bg-muted/30")
        }
      >
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            aria-label="Alle e-mails selecteren"
            className={CHECKBOX}
          />
          {selected.size > 0 ? (
            <span className="font-medium">{selected.size} geselecteerd</span>
          ) : (
            <span className="text-muted-foreground">Alles selecteren</span>
          )}
        </label>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
              disabled={pending}
            >
              Wis selectie
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={deleteSelected}
              disabled={pending}
            >
              {pending
                ? "Verwijderen…"
                : `Verwijder selectie (${selected.size})`}
            </Button>
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-3">
        {rows.map((r) => {
          const checked = selected.has(r.id);
          return (
            <div
              key={r.id}
              className={
                "rounded-lg border p-4 " + (checked ? "bg-accent/40" : "")
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(r.id)}
                    aria-label={`Selecteer e-mail: ${r.subject}`}
                    className={CHECKBOX}
                  />
                  <Badge variant={variant(r.status)}>{r.status}</Badge>
                  <span className="text-sm font-medium">{r.subject}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatHumanDateTime(new Date(r.created_at))}
                </span>
              </div>
              <p className="mt-1 break-all text-xs text-muted-foreground">
                {r.to_email}
                {r.context ? ` · ${r.context}` : ""}
              </p>
              {r.error && (
                <p className="mt-1 break-all text-xs text-red-600">
                  {r.error}
                </p>
              )}
              <div className="mt-3">
                <EmailResend id={r.id} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
