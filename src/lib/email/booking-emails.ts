import "server-only";
import { sendEmail } from "@/lib/email/client";
import {
  bookingConfirmationEmail,
  bookingRescheduledEmail,
  bookingAdminText,
  googleCalendarUrl,
} from "@/lib/email/messages";
import { bookingIcs } from "@/lib/email/ics";
import { signBooking } from "@/lib/booking-token";
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

/** Admin notice of a new booking. No-ops if ADMIN_NOTIFY_EMAIL is unset. */
export async function sendBookingAdminNotice(m: BookingMail): Promise<void> {
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
  if (!adminEmail) {
    console.warn("[email] ADMIN_NOTIFY_EMAIL not set — admin notice skipped");
    return;
  }
  await sendEmail({
    to: adminEmail,
    subject: `Nieuwe boeking — ${m.serviceName}`,
    context: "booking_admin",
    text: bookingAdminText({
      serviceName: m.serviceName,
      startsAt: m.startsAt,
      customerName: m.customer.fullName,
      customerEmail: m.customer.email,
      customerPhone: m.customer.phone,
      notes: m.customer.notes,
      bookingUrl: `${siteUrl()}/boekingen/${m.bookingId}`,
    }),
    replyTo: m.customer.email,
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
