import type { Metadata } from "next";
import { getBookingDetail } from "@/lib/db/bookings";
import { hasReviewForBooking } from "@/lib/db/reviews";
import { verifyBookingToken } from "@/lib/booking-token";
import { formatHumanDateTime } from "@/lib/time";
import { ReviewForm } from "@/components/public/review-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Review achterlaten",
  robots: { index: false },
};

function hasVisited(
  status: string,
  endsAt: string | undefined,
): boolean {
  if (!endsAt) return false;
  if (status !== "confirmed" && status !== "completed") return false;
  return new Date(endsAt).getTime() <= Date.now();
}

export default async function ReviewPage({
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
  const already = booking ? await hasReviewForBooking(id) : false;

  const eligible =
    !!booking && hasVisited(booking.status, booking.ends_at);

  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <h1 className="text-3xl tracking-tight">Hoe was je afspraak?</h1>

      {!valid || !booking ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Deze link is ongeldig of verlopen.
        </p>
      ) : already ? (
        <div className="mt-6 rounded-lg border border-emerald-300 bg-emerald-50 p-6 text-sm text-emerald-900">
          <p className="font-medium">Je review is al binnen.</p>
          <p className="mt-1">Bedankt — daar zijn we heel blij mee!</p>
        </div>
      ) : !eligible ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Voor deze afspraak kun je (nog) geen review achterlaten.
        </p>
      ) : (
        <div className="mt-6">
          <div className="rounded-lg border bg-card p-6 text-sm">
            <p className="font-medium">{booking.service.name}</p>
            <p className="mt-1 text-muted-foreground">
              {formatHumanDateTime(new Date(booking.starts_at))}
            </p>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Je review verschijnt op de website zodra we hem hebben bekeken.
          </p>
          <div className="mt-4">
            <ReviewForm
              bookingId={id}
              token={token!}
              defaultAuthor={booking.customer.full_name}
            />
          </div>
        </div>
      )}
    </div>
  );
}
