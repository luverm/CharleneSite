"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CustomerListItem } from "@/lib/db/admin-customers";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { deleteCustomersAction } from "@/actions/admin-customer";

const CHECKBOX = "h-4 w-4 rounded border-input accent-primary";

/** Customer list with multi-select delete (customers without bookings). */
export function CustomersList({
  customers,
  isMobile,
}: {
  customers: CustomerListItem[];
  isMobile: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const deletableIds = customers
    .filter((c) => c.bookings_count === 0)
    .map((c) => c.id);
  const allSelected =
    deletableIds.length > 0 && selected.size === deletableIds.length;

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
      prev.size === deletableIds.length ? new Set() : new Set(deletableIds),
    );
  }

  function deleteSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    startTransition(async () => {
      const r = await deleteCustomersAction(ids);
      if (r.ok) {
        toast.success(`${r.deleted ?? 0} klant(en) verwijderd`);
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
        {deletableIds.length > 0 ? (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              aria-label="Alle verwijderbare klanten selecteren"
              className={CHECKBOX + " cursor-pointer"}
            />
            {selected.size > 0 ? (
              <span className="font-medium">
                {selected.size} geselecteerd
              </span>
            ) : (
              <span className="text-muted-foreground">
                Klanten zonder boekingen selecteren
              </span>
            )}
          </label>
        ) : (
          <span className="text-sm text-muted-foreground">
            Alleen klanten zonder boekingen kun je verwijderen.
          </span>
        )}
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

      {isMobile ? (
        <div className="mt-3 grid gap-3">
          {customers.map((c) => (
            <CustomerCard
              key={c.id}
              c={c}
              checked={selected.has(c.id)}
              onToggle={() => toggle(c.id)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <span className="sr-only">Selecteren</span>
                </TableHead>
                <TableHead>Naam</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefoon</TableHead>
                <TableHead className="text-right">Boekingen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <CustomerRow
                  key={c.id}
                  c={c}
                  checked={selected.has(c.id)}
                  onToggle={() => toggle(c.id)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function SelectBox({
  c,
  checked,
  onToggle,
  className,
}: {
  c: CustomerListItem;
  checked: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const locked = c.bookings_count > 0;
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={locked}
      onChange={onToggle}
      aria-label={`Selecteer ${c.full_name}`}
      title={locked ? "Heeft boekingen — niet verwijderbaar" : undefined}
      className={
        CHECKBOX +
        (locked ? " opacity-40" : " cursor-pointer") +
        (className ? " " + className : "")
      }
    />
  );
}

function CustomerRow({
  c,
  checked,
  onToggle,
}: {
  c: CustomerListItem;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <TableRow className={checked ? "bg-accent/40" : undefined}>
      <TableCell>
        <SelectBox c={c} checked={checked} onToggle={onToggle} />
      </TableCell>
      <TableCell className="font-medium">
        <Link
          href={`/klanten/${c.id}`}
          className="underline-offset-4 hover:underline"
        >
          {c.full_name}
        </Link>
      </TableCell>
      <TableCell>
        <a href={`mailto:${c.email}`}>{c.email}</a>
      </TableCell>
      <TableCell>{c.phone ?? "—"}</TableCell>
      <TableCell className="text-right">
        <Link
          href={`/boekingen?q=${encodeURIComponent(c.email)}`}
          className="underline-offset-4 hover:underline"
        >
          {c.bookings_count}
        </Link>
      </TableCell>
    </TableRow>
  );
}

function CustomerCard({
  c,
  checked,
  onToggle,
}: {
  c: CustomerListItem;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={
        "rounded-lg border p-4 " + (checked ? "bg-accent/40" : "")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <SelectBox
            c={c}
            checked={checked}
            onToggle={onToggle}
            className="mt-0.5"
          />
          <Link
            href={`/klanten/${c.id}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {c.full_name}
          </Link>
        </div>
        <Link
          href={`/boekingen?q=${encodeURIComponent(c.email)}`}
          className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs"
        >
          {c.bookings_count} boeking{c.bookings_count === 1 ? "" : "en"}
        </Link>
      </div>
      <a
        href={`mailto:${c.email}`}
        className="mt-2 block break-all text-sm text-muted-foreground"
      >
        {c.email}
      </a>
      {c.phone && (
        <a
          href={`tel:${c.phone}`}
          className="mt-1 block text-sm text-muted-foreground"
        >
          {c.phone}
        </a>
      )}
    </div>
  );
}
