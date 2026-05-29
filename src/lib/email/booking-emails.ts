import "server-only";
import { sendEmail } from "@/lib/email/client";
import {
  bookingConfirmationEmail,
  bookingRescheduledEmail,
  googleCalendarUrl,
} from "@/lib/email/messages";
import { bookingIcs } from "@/lib/email/ics";
import { signBooking } from "@/lib/booking-token";
import { recordAdminNotification } from "@/lib/db/notifications";
import { formatHumanDateTime } from "@/lib/time";
import { business } from "@/content/business";

type Customer = {
  fullName: string;
  email: string;
  phone: string;
  notes?: string;
};

type BookingMail = {
  bookingId: string;
  startsAt: Date;
  endsAt: Date;
  serviceName: string;
  customer: Customer;
};

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** Customer confirmation with .ics + calendar + self-service cancel link. */
export async function sendBookingConfirmation(m: BookingMail): Promise<void> {
  const title = `${business.name} — ${m.serviceName}`;
  const cancelUrl = `${siteUrl()}/afspraak/${m.bookingId}?token=${signBooking(
    m.bookingId,
  )}`;
  const calendarUrl = googleCalendarUrl({
    title,
    startsAt: m.startsAt,
    endsAt: m.endsAt,
    details: `Afspraak voor ${m.serviceName}`,
  });
  const ics = bookingIcs({
    id: m.bookingId,
    title,
    startsAt: m.startsAt,
    endsAt: m.endsAt,
    description: `Afspraak voor ${m.serviceName}`,
  });

  await sendEmail({
    to: m.customer.email,
    context: "booking_confirmation",
    ...(await bookingConfirmationEmail({
      customerName: m.customer.fullName,
      serviceName: m.serviceName,
      startsAt: m.startsAt,
      calendarUrl,
      cancelUrl,
    })),
    attachments: ics
      ? [{ filename: "afspraak.ics", content: ics, contentType: "text/calendar" }]
      : undefined,
  });
}

/** In-app notification when a new booking comes in. */
export async function sendBookingAdminNotice(m: BookingMail): Promise<void> {
  const lines = [
    `${m.customer.fullName} (${m.customer.email})`,
    `Wanneer: ${formatHumanDateTime(m.startsAt)}`,
    m.customer.phone ? `Telefoon: ${m.customer.phone}` : null,
    m.customer.notes ? `Notitie: ${m.customer.notes}` : null,
  ].filter((l): l is string => l !== null);
  await recordAdminNotification({
    kind: "booking_created",
    title: `Nieuwe boeking — ${m.serviceName}`,
    body: lines.join("\n"),
    href: `/boekingen/${m.bookingId}`,
  });
}

/** Tell the customer their appointment was moved to a new time. */
export async function sendBookingRescheduled(m: BookingMail): Promise<void> {
  const title = `${business.name} — ${m.serviceName}`;
  const cancelUrl = `${siteUrl()}/afspraak/${m.bookingId}?token=${signBooking(
    m.bookingId,
  )}`;
  const calendarUrl = googleCalendarUrl({
    title,
    startsAt: m.startsAt,
    endsAt: m.endsAt,
    details: `Afspraak voor ${m.serviceName}`,
  });
  const ics = bookingIcs({
    id: m.bookingId,
    title,
    startsAt: m.startsAt,
    endsAt: m.endsAt,
    description: `Afspraak voor ${m.serviceName}`,
  });

  await sendEmail({
    to: m.customer.email,
    context: "booking_rescheduled",
    ...(await bookingRescheduledEmail({
      customerName: m.customer.fullName,
      serviceName: m.serviceName,
      startsAt: m.startsAt,
      calendarUrl,
      cancelUrl,
    })),
    attachments: ics
      ? [{ filename: "afspraak.ics", content: ics, contentType: "text/calendar" }]
      : undefined,
  });
}
