import Link from "next/link";
import { BackLink } from "@/components/admin/back-link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCustomerDetail } from "@/lib/db/admin-customers";
import { getNoShowFlags } from "@/lib/db/no-show";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomerNotesForm } from "@/components/admin/customer-notes-form";
import { NoShowDismiss } from "@/components/admin/no-show-dismiss";
import { formatPrice } from "@/lib/db/services";
import { formatHumanDateTime } from "@/lib/time";
import { bookingStatusLabel, bookingStatusVariant } from "@/lib/status-labels";

export const metadata: Metadata = {
  title: "Klant",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomerDetail(id);
  if (!customer) notFound();

  const flagged = await getNoShowFlags([customer.id]);
  const isFlagged = flagged.has(customer.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <BackLink fallback="/klanten" />

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {customer.full_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground break-all">
            <a href={`mailto:${customer.email}`}>{customer.email}</a>
            {customer.phone && (
              <>
                {" · "}
                <a href={`tel:${customer.phone}`}>{customer.phone}</a>
              </>
            )}
          </p>
        </div>
        <Link
          href={`/boekingen/nieuw?customer=${customer.id}`}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Nieuwe boeking
        </Link>
      </div>

      {isFlagged && (
        <div className="mt-6 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold">
            Let op: {customer.noShowCount} no-shows
          </p>
          <NoShowDismiss customerId={customer.id} />
        </div>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Boekingen" value={String(customer.totalBookings)} />
        <Stat label="No-shows" value={String(customer.noShowCount)} />
        <Stat label="Besteed" value={formatPrice(customer.spentCents)} />
      </section>

      <Card className="mt-6 p-6">
        <h2 className="text-base font-semibold">Interne notitie</h2>
        <div className="mt-4">
          <CustomerNotesForm
            customerId={customer.id}
            initialNotes={customer.notes}
          />
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="text-base font-semibold">Boekingen</h2>
        {customer.bookings.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nog geen boekingen.
          </p>
        ) : (
          <ul className="mt-3 divide-y">
            {customer.bookings.map((b) => (
              <li key={b.id} className="py-3">
                <Link
                  href={`/boekingen/${b.id}`}
                  className="flex items-center justify-between gap-3 text-sm hover:opacity-80"
                >
                  <span>{formatHumanDateTime(new Date(b.starts_at))}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {b.service?.name ?? "—"}
                    </span>
                    <Badge variant={bookingStatusVariant(b.status)}>
                      {bookingStatusLabel(b.status)}
                    </Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </Card>
  );
}
