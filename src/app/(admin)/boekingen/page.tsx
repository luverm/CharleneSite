import Link from "next/link";
import type { Metadata } from "next";
import { listBookings } from "@/lib/db/admin-bookings";
import { listAllServices } from "@/lib/db/admin-services";
import { getNoShowFlags } from "@/lib/db/no-show";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getDeviceInfo } from "@/lib/device";
import { DangerDeleteBookings } from "@/components/admin/danger-delete-bookings";
import { BookingsList } from "@/components/admin/bookings-list";
import { BOOKING_STATUS_LABELS } from "@/lib/status-labels";

export const metadata: Metadata = {
  title: "Boekingen",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  { value: "", label: "Alle statussen" },
  ...Object.entries(BOOKING_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

type SearchParams = {
  from?: string;
  to?: string;
  status?: string;
  service?: string;
  q?: string;
};

export default async function BoekingenPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const [services, bookings, device] = await Promise.all([
    listAllServices(),
    listBookings({
      from: params.from || undefined,
      to: params.to || undefined,
      status: (params.status as never) || undefined,
      serviceId: params.service || undefined,
      q: params.q || undefined,
    }),
    getDeviceInfo(),
  ]);

  const flagged = await getNoShowFlags(bookings.map((b) => b.customer_id));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Boekingen</h1>
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {bookings.length}{" "}
            {bookings.length === 1 ? "boeking" : "boekingen"}
          </p>
          <Link
            href="/boekingen/nieuw"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Nieuwe boeking
          </Link>
        </div>
      </header>

      <form
        method="get"
        className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <div>
          <Label htmlFor="from">Vanaf</Label>
          <Input id="from" type="date" name="from" defaultValue={params.from ?? ""} />
        </div>
        <div>
          <Label htmlFor="to">Tot</Label>
          <Input id="to" type="date" name="to" defaultValue={params.to ?? ""} />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={params.status ?? ""}
            className="block h-9 w-full rounded-md border bg-background px-2 text-sm"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="service">Dienst</Label>
          <select
            id="service"
            name="service"
            defaultValue={params.service ?? ""}
            className="block h-9 w-full rounded-md border bg-background px-2 text-sm"
          >
            <option value="">Alle diensten</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="q">Zoek klant</Label>
          <Input
            id="q"
            type="search"
            name="q"
            placeholder="naam of e-mail"
            defaultValue={params.q ?? ""}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-5 flex justify-end gap-2">
          <Button type="submit">Filter</Button>
          <Link
            href="/boekingen"
            className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 text-sm hover:bg-accent"
          >
            Reset
          </Link>
        </div>
      </form>

      {bookings.length === 0 ? (
        <p className="mt-6 rounded-lg border p-8 text-center text-sm text-muted-foreground">
          Geen boekingen gevonden.
        </p>
      ) : (
        <BookingsList
          bookings={bookings}
          flaggedEntries={[...flagged]}
          isMobile={device.isMobile}
        />
      )}

      <DangerDeleteBookings />
    </div>
  );
}
