import type { Metadata } from "next";
import { getBookingDetail } from "@/lib/db/bookings";
import { verifyBookingToken } from "@/lib/booking-token";
import { formatHumanDateTime } from "@/lib/time";
import { CancelBooking } from "@/components/public/cancel-booking";
import { RescheduleOwnBooking } from "@/components/public/reschedule-own-booking";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Je afspraak",
  robots: { index: false },
};

export default async function AfspraakPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  const valid = !!token && verifyBookingToken(id, token);
  const booking = valid ? await getBookingDetail(id) : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <h1 className="text-3xl tracking-tight">Je afspraak</h1>

      {!valid || !booking ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Deze link is ongeldig of verlopen. Neem gerust contact met ons op
          als je je afspraak wilt wijzigen.
        </p>
      ) : booking.status === "cancelled" ? (
        <div className="mt-6 rounded-lg border bg-muted/30 p-6 text-sm">
          <p className="font-medium">Deze afspraak is geannuleerd.</p>
          <p className="mt-1 text-muted-foreground">
            Wil je een nieuwe afspraak? Boek gerust opnieuw online.
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <div className="rounded-lg border bg-card p-6 text-sm">
            <p className="font-medium">{booking.service.name}</p>
            <p className="mt-1 text-muted-foreground">
              {formatHumanDateTime(new Date(booking.starts_at))}
            </p>
            <p className="mt-1 text-muted-foreground">
              {booking.customer.full_name}
            </p>
          </div>

          <div className="mt-6">
            <RescheduleOwnBooking
              id={id}
              token={token!}
              serviceId={booking.service_id}
              staffId={booking.staff_id}
            />
          </div>

          <div className="mt-3">
            <CancelBooking id={id} token={token!} />
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Kom je er niet uit? Neem gerust contact met ons op.
          </p>
        </div>
      )}
    </div>
  );
}
