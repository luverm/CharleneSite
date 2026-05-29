"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import type { BookingListItem } from "@/lib/db/admin-bookings";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteBookingButton } from "@/components/admin/delete-booking-button";
import { deleteBookingsAction } from "@/actions/admin-booking";
import { formatHumanDateTime } from "@/lib/time";
import { formatPrice } from "@/lib/services-format";
import { bookingStatusLabel, bookingStatusVariant } from "@/lib/status-labels";

const CHECKBOX =
  "h-4 w-4 cursor-pointer rounded border-input accent-primary";

export function BookingsList({
  bookings,
  flaggedEntries,
  isMobile,
}: {
  bookings: BookingListItem[];
  flaggedEntries: [string, number][];
  isMobile: boolean;
}) {
  const router = useRouter();
  const flagged = useMemo(() => new Map(flaggedEntries), [flaggedEntries]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const allSelected =
    bookings.length > 0 && selected.size === bookings.length;
  const someSelected = selected.size > 0 && !allSelected;

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
      prev.size === bookings.length
        ? new Set()
        : new Set(bookings.map((b) => b.id)),
    );
  }

  function deleteSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    startTransition(async () => {
      const r = await deleteBookingsAction(ids);
      if (r.ok) {
        toast.success(`${r.deleted ?? ids.length} boeking(en) verwijderd`);
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
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={toggleAll}
            ariaLabel="Alle boekingen selecteren"
          />
          {selected.size > 0 ? (
            <span className="font-medium">
              {selected.size} geselecteerd
            </span>
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
          {bookings.map((b) => (
            <MobileCard
              key={b.id}
              b={b}
              flagged={flagged}
              checked={selected.has(b.id)}
              onToggle={() => toggle(b.id)}
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
                <TableHead>Wanneer</TableHead>
                <TableHead>Klant</TableHead>
                <TableHead>Dienst</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Prijs</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Acties</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => (
                <DesktopRow
                  key={b.id}
                  b={b}
                  flagged={flagged}
                  checked={selected.has(b.id)}
                  onToggle={() => toggle(b.id)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={ariaLabel}
      className={CHECKBOX}
    />
  );
}

function DesktopRow({
  b,
  flagged,
  checked,
  onToggle,
}: {
  b: BookingListItem;
  flagged: Map<string, number>;
  checked: boolean;
  onToggle: () => void;
}) {
  const name = b.customer?.full_name ?? "klant";
  return (
    <TableRow className={checked ? "bg-accent/40" : undefined}>
      <TableCell>
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          aria-label={`Selecteer boeking van ${name}`}
          className={CHECKBOX}
        />
      </TableCell>
      <TableCell>
        <Link href={`/boekingen/${b.id}`} className="block">
          {formatHumanDateTime(new Date(b.starts_at))}
        </Link>
      </TableCell>
      <TableCell>
        <Link href={`/boekingen/${b.id}`} className="block">
          <span className="inline-flex items-center gap-1.5 font-medium">
            {flagged.has(b.customer_id) && (
              <AlertTriangle
                className="h-4 w-4 shrink-0 text-amber-600"
                aria-label={`Let op: ${flagged.get(b.customer_id)} no-shows`}
              />
            )}
            {b.customer?.full_name ?? "—"}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">
            {b.customer?.email}
          </span>
        </Link>
      </TableCell>
      <TableCell>{b.service?.name ?? "—"}</TableCell>
      <TableCell>
        <Badge variant={bookingStatusVariant(b.status)}>
          {bookingStatusLabel(b.status)}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        {b.service ? formatPrice(b.service.price_cents) : "—"}
      </TableCell>
      <TableCell className="text-right">
        <DeleteBookingButton bookingId={b.id} customerName={name} />
      </TableCell>
    </TableRow>
  );
}

function MobileCard({
  b,
  flagged,
  checked,
  onToggle,
}: {
  b: BookingListItem;
  flagged: Map<string, number>;
  checked: boolean;
  onToggle: () => void;
}) {
  const name = b.customer?.full_name ?? "klant";
  return (
    <div
      className={"rounded-lg border " + (checked ? "bg-accent/40" : "")}
    >
      <Link
        href={`/boekingen/${b.id}`}
        className="block p-4 hover:bg-accent"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="text-sm font-medium">
            {formatHumanDateTime(new Date(b.starts_at))}
          </span>
          <Badge variant={bookingStatusVariant(b.status)}>
            {bookingStatusLabel(b.status)}
          </Badge>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-sm font-medium">
          {flagged.has(b.customer_id) && (
            <AlertTriangle
              className="h-4 w-4 shrink-0 text-amber-600"
              aria-label={`Let op: ${flagged.get(b.customer_id)} no-shows`}
            />
          )}
          {b.customer?.full_name ?? "—"}
        </p>
        {b.customer?.email && (
          <p className="text-xs text-muted-foreground break-all">
            {b.customer.email}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between text-sm">
          <span>{b.service?.name ?? "—"}</span>
          <span className="font-medium">
            {b.service ? formatPrice(b.service.price_cents) : "—"}
          </span>
        </div>
      </Link>
      <div className="flex items-center justify-between border-t px-4 py-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            aria-label={`Selecteer boeking van ${name}`}
            className={CHECKBOX}
          />
          Selecteren
        </label>
        <DeleteBookingButton bookingId={b.id} customerName={name} />
      </div>
    </div>
  );
}
