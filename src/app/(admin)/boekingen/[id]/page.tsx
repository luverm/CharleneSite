import Link from "next/link";
import { BackLink } from "@/components/admin/back-link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { getBookingDetail } from "@/lib/db/bookings";
import { getNoShowFlags } from "@/lib/db/no-show";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookingStatusActions } from "@/components/admin/booking-status-actions";
import { RescheduleBooking } from "@/components/admin/reschedule-booking";
import { BookingDurationButton } from "@/components/admin/booking-duration-button";
import { BookingNotesForm } from "@/components/admin/booking-notes-form";
import { BookingPayment } from "@/components/admin/booking-payment";
import { NoShowDismiss } from "@/components/admin/no-show-dismiss";
import { formatHumanDateTime, formatIsoDate } from "@/lib/time";
import { formatPrice, formatDuration } from "@/lib/db/services";
import { bookingStatusLabel, bookingStatusVariant } from "@/lib/status-labels";

export const metadata: Metadata = {
  title: "Boeking detail",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booking = await getBookingDetail(id);
  if (!booking) notFound();

  const flagged = await getNoShowFlags([booking.customer_id]);
  const noShowCount = flagged.get(booking.customer_id);

  // The booking's actual length — may differ from the service default.
  const currentMinutes = Math.round(
    (new Date(booking.ends_at).getTime() -
      new Date(booking.starts_at).getTime()) /
      60_000,
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <BackLink fallback="/boekingen" />

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        {booking.service.name}
      </h1>
      <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
        <span>{formatHumanDateTime(new Date(booking.starts_at))}</span>
        <Badge variant={bookingStatusVariant(booking.status)}>
          {bookingStatusLabel(booking.status)}
        </Badge>
      </div>

      {noShowCount !== undefined && (
        <div className="mt-6 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold">
                Let op: deze klant heeft {noShowCount} no-shows
              </p>
              <p className="text-xs">
                Houd hier rekening mee — bv. bevestiging vragen of
                vooruitbetaling.
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <NoShowDismiss customerId={booking.customer_id} />
          </div>
        </div>
      )}

      <Card className="mt-8 grid gap-3 p-6 text-sm">
        <Row label="Klant" value={booking.customer.full_name} />
        <Row label="E-mail" value={<a href={`mailto:${booking.customer.email}`}>{booking.customer.email}</a>} />
        {booking.customer.phone && (
          <Row label="Telefoon" value={<a href={`tel:${booking.customer.phone}`}>{booking.customer.phone}</a>} />
        )}
        <Row label="Duur" value={formatDuration(currentMinutes)} />
        <Row label="Prijs" value={formatPrice(booking.service.price_cents)} />
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="text-base font-semibold">Acties</h2>
        <div className="mt-4 flex flex-col gap-4">
          <BookingStatusActions bookingId={booking.id} status={booking.status} />
          {booking.status !== "cancelled" && (
            <RescheduleBooking
              bookingId={booking.id}
              serviceId={booking.service_id}
              staffId={booking.staff_id}
              durationMin={booking.service.duration_min}
            />
          )}
          {booking.status !== "cancelled" && (
            <BookingDurationButton
              bookingId={booking.id}
              currentMinutes={currentMinutes}
            />
          )}
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/boekingen/${booking.id}/factuur`}
              className="inline-flex h-9 w-fit items-center justify-center rounded-md border bg-background px-4 text-sm font-medium hover:bg-accent"
            >
              Factuur maken
            </Link>
            <Link
              href={`/agenda?view=dag&date=${formatIsoDate(
                new Date(booking.starts_at),
              )}`}
              className="inline-flex h-9 w-fit items-center justify-center rounded-md border bg-background px-4 text-sm font-medium hover:bg-accent"
            >
              Toon in agenda
            </Link>
          </div>
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="text-base font-semibold">Betaling</h2>
        <div className="mt-4">
          <BookingPayment
            bookingId={booking.id}
            initialPaid={booking.paid ?? false}
            initialMethod={booking.paid_method}
            initialAmountCents={booking.paid_amount_cents}
            servicePriceCents={booking.service.price_cents}
          />
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="text-base font-semibold">Interne notitie</h2>
        <div className="mt-4">
          <BookingNotesForm
            bookingId={booking.id}
            initialNotes={booking.notes}
          />
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
