"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import type { InvoiceListItem } from "@/lib/db/invoices";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/services-format";
import { deleteInvoicesAction } from "@/actions/admin-invoice";

const CHECKBOX =
  "h-4 w-4 cursor-pointer rounded border-input accent-primary";

export function InvoicesList({
  invoices,
}: {
  invoices: InvoiceListItem[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const allSelected = invoices.length > 0 && selected.size === invoices.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === invoices.length
        ? new Set()
        : new Set(invoices.map((i) => i.id)),
    );
  }

  function deleteIds(ids: string[]) {
    if (ids.length === 0) return;
    startTransition(async () => {
      const r = await deleteInvoicesAction(ids);
      if (r.ok) {
        toast.success(
          `${r.deleted ?? 0} factuur${(r.deleted ?? 0) === 1 ? "" : "en"} verwijderd`,
        );
        setSelected((prev) => {
          const next = new Set(prev);
          for (const id of ids) next.delete(id);
          return next;
        });
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
            aria-label="Alle facturen selecteren"
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
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
              disabled={pending}
            >
              Wis selectie
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => deleteIds([...selected])}
              disabled={pending}
            >
              {pending
                ? "Verwijderen…"
                : `Verwijder selectie (${selected.size})`}
            </Button>
          </div>
        )}
      </div>

      {/* Mobile: stacked cards */}
      <div className="mt-3 grid gap-3 sm:hidden">
        {invoices.map((inv) => {
          const checked = selected.has(inv.id);
          return (
            <div
              key={inv.id}
              className={
                "rounded-lg border p-4 " + (checked ? "bg-accent/40" : "")
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(inv.id)}
                    aria-label={`Selecteer factuur ${inv.number}`}
                    className={CHECKBOX + " mt-1"}
                  />
                  <div>
                    <Link
                      href={`/facturen/${inv.id}`}
                      className="text-base font-medium underline underline-offset-4"
                    >
                      {inv.number}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {inv.issued_on} ·{" "}
                      {inv.booking_id ? "Boeking" : "Bruid"}
                    </p>
                  </div>
                </div>
                <DeleteInvoiceButton
                  number={inv.number}
                  onDelete={() => deleteIds([inv.id])}
                  pending={pending}
                />
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-3 text-sm">
                <span className="break-words">{inv.customer_name}</span>
                <span className="shrink-0 text-base font-medium tabular-nums">
                  {formatPrice(inv.total_cents)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="mt-3 hidden overflow-x-auto rounded-lg border sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="w-10 px-4 py-3">
                <span className="sr-only">Selecteren</span>
              </th>
              <th className="px-4 py-3">Nummer</th>
              <th className="px-4 py-3">Datum</th>
              <th className="px-4 py-3">Klant</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Totaal</th>
              <th className="w-10 px-4 py-3">
                <span className="sr-only">Acties</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {invoices.map((inv) => {
              const checked = selected.has(inv.id);
              return (
                <tr
                  key={inv.id}
                  className={checked ? "bg-accent/40" : "hover:bg-accent/40"}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(inv.id)}
                      aria-label={`Selecteer factuur ${inv.number}`}
                      className={CHECKBOX}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/facturen/${inv.id}`}
                      className="font-medium underline underline-offset-4"
                    >
                      {inv.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {inv.issued_on}
                  </td>
                  <td className="px-4 py-3">{inv.customer_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {inv.booking_id ? "Boeking" : "Bruid"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatPrice(inv.total_cents)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DeleteInvoiceButton
                      number={inv.number}
                      onDelete={() => deleteIds([inv.id])}
                      pending={pending}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeleteInvoiceButton({
  number,
  onDelete,
  pending,
}: {
  number: string;
  onDelete: () => void;
  pending: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            onDelete();
          }}
          disabled={pending}
          className="inline-flex h-8 items-center rounded-md bg-destructive/10 px-2 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
        >
          Verwijder
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="inline-flex h-8 items-center rounded-md border px-2 text-xs hover:bg-accent disabled:opacity-50"
        >
          Annuleer
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label={`Factuur ${number} verwijderen`}
      title="Factuur verwijderen"
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
