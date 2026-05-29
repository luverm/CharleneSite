import "server-only";
import { getBookingDetail } from "@/lib/db/bookings";
import { findWaitlistMatches } from "@/lib/db/waitlist";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email/client";
import { waitlistOpeningEmail } from "@/lib/email/messages";
import { formatIsoDate, formatTime } from "@/lib/time";
import { signWaitlist } from "@/lib/booking-token";

/**
 * A future slot freed up (cancellation or reschedule) — let matching
 * waitlist customers know. Whoever books first wins; the bookings
 * exclusion constraint makes the race safe, so the late ones simply
 * see the slot gone. Best-effort: never throws, so it can't block the
 * action that freed the slot.
 */
export async function notifyWaitlistForFreedSlot(args: {
  serviceId: string;
  startsAt: string | Date;
}): Promise<number> {
  const freedAt = new Date(args.startsAt);
  // No point nudging anyone toward a slot in the past.
  if (Number.isNaN(freedAt.getTime()) || freedAt.getTime() <= Date.now()) {
    return 0;
  }

  const svc = createSupabaseServiceClient();
  const { data: service } = await svc
    .from("services")
    .select("slug, name")
    .eq("id", args.serviceId)
    .maybeSingle();
  if (!service) return 0;

  const matches = await findWaitlistMatches({
    serviceId: args.serviceId,
    date: formatIsoDate(freedAt),
  });
  if (matches.length === 0) return 0;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  // The freed slot's service/date/time (not PII) goes in the link; the
  // customer's contact details stay behind the signed waitlist id so
  // the booking form can pre-fill them and offer a one-click confirm.
  const datum = formatIsoDate(freedAt);
  const tijd = formatTime(freedAt);

  let sent = 0;
  for (const m of matches) {
    const params = new URLSearchParams({
      dienst: service.slug,
      datum,
      tijd,
      wl: m.id,
      token: signWaitlist(m.id),
    });
    const bookingUrl = `${siteUrl}/boeken?${params.toString()}`;
    try {
      await sendEmail({
        to: m.email,
        context: "waitlist_opening",
        ...(await waitlistOpeningEmail({
          customerName: m.full_name,
          serviceName: service.name,
          freedAt,
          bookingUrl,
        })),
      });
      sent += 1;
    } catch (err) {
      console.error(`[waitlist-backfill] mail to ${m.email} failed:`, err);
    }
  }
  return sent;
}

/** Cancellation path: derive the freed slot from the booking row. */
export async function notifyWaitlistForFreedBooking(
  bookingId: string,
): Promise<number> {
  const booking = await getBookingDetail(bookingId);
  if (!booking) return 0;
  return notifyWaitlistForFreedSlot({
    serviceId: booking.service_id,
    startsAt: booking.starts_at,
  });
}
