"use server";

import { bookingInputSchema } from "@/lib/schemas/booking";
import {
  cancelBooking as dbCancelBooking,
  findBookingByIdempotencyKey,
  getBookingDetail,
  insertBooking,
  isExclusionViolation,
  writeAuditLog,
} from "@/lib/db/bookings";
import { verifyBookingToken } from "@/lib/booking-token";
import {
  notifyWaitlistForFreedBooking,
  notifyWaitlistForFreedSlot,
} from "@/lib/waitlist-backfill";
import { resolveWaitlistForCustomer } from "@/lib/db/waitlist";
import { upsertCustomerByEmail } from "@/lib/db/customers";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email/client";
import { bookingCancelledEmail } from "@/lib/email/messages";
import { recordAdminNotification } from "@/lib/db/notifications";
import {
  sendBookingConfirmation,
  sendBookingAdminNotice,
  sendBookingRescheduled,
} from "@/lib/email/booking-emails";
import { getAvailableSlots } from "@/lib/db/availability";
import { formatIsoDate } from "@/lib/time";
import { requireAdmin } from "@/lib/auth/require-admin";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export type CreateBookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; code: "SLOT_TAKEN" | "INVALID_INPUT" | "INTERNAL"; message?: string };

type ServiceLookup = {
  id: string;
  name: string;
  duration_min: number;
};

async function loadService(serviceId: string): Promise<ServiceLookup | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, name, duration_min, kind, is_active, is_online_bookable")
    .eq("id", serviceId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (!data.is_active || !data.is_online_bookable) {
    return null;
  }
  return { id: data.id, name: data.name, duration_min: data.duration_min };
}

export async function createBooking(input: unknown): Promise<CreateBookingResult> {
  const parsed = bookingInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "INVALID_INPUT", message: parsed.error.message };
  }
  const data = parsed.data;

  // Honeypot — silently succeed-shaped failure so bots don't probe.
  if (data.website) {
    return { ok: false, code: "INVALID_INPUT" };
  }

  // Rate-limit anonymous booking so the calendar/mailer can't be spammed.
  const ip = await getClientIp();
  const limited = await rateLimit({
    key: `booking:${ip}`,
    max: 5,
    windowMs: 60 * 1000,
  });
  if (!limited.ok) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "Te veel verzoeken — probeer het zo opnieuw.",
    };
  }

  // 1. Idempotency: have we seen this key?
  const existing = await findBookingByIdempotencyKey(data.idempotencyKey);
  if (existing) return { ok: true, bookingId: existing.id };

  // 2. Validate service is online-bookable.
  const service = await loadService(data.serviceId);
  if (!service) {
    return { ok: false, code: "INVALID_INPUT", message: "Dienst niet boekbaar" };
  }

  // 3. Sanity-check the duration matches the requested window.
  const startMs = new Date(data.startsAt).getTime();
  const endMs = new Date(data.endsAt).getTime();
  if (endMs - startMs !== service.duration_min * 60_000) {
    return { ok: false, code: "INVALID_INPUT", message: "Tijd komt niet overeen met dienst" };
  }

  // 3b. The server is the authority: only allow a slot the canonical
  // availability algorithm actually offers (opening hours, time_off,
  // lead time, the past). The GIST constraint only stops overlap.
  const offered = await getAvailableSlots({
    staffId: data.staffId,
    serviceId: data.serviceId,
    date: formatIsoDate(new Date(data.startsAt)),
  });
  const slotOk = offered.some(
    (s) =>
      s.startsAt.toISOString() === new Date(data.startsAt).toISOString() &&
      s.endsAt.toISOString() === new Date(data.endsAt).toISOString(),
  );
  if (!slotOk) {
    return { ok: false, code: "SLOT_TAKEN" };
  }

  // 4. Upsert customer. Contact details are optional — without an
  // e-mail we create a standalone record with a non-deliverable address.
  const customerEmail = (data.customer.email ?? "").trim();
  const hasEmail = customerEmail.length > 0;
  const customerName =
    (data.customer.fullName ?? "").trim() || "Onbekende klant";
  const customer = await upsertCustomerByEmail({
    email: hasEmail
      ? customerEmail
      : `${data.idempotencyKey}@geen-email.invalid`,
    full_name: customerName,
    phone: data.customer.phone || undefined,
  });

  // 5. Insert booking; rely on the GIST exclusion constraint to detect a race.
  let booking;
  try {
    booking = await insertBooking({
      staffId: data.staffId,
      serviceId: data.serviceId,
      customerId: customer.id,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      notes: data.customer.notes || undefined,
      idempotencyKey: data.idempotencyKey,
    });
  } catch (err) {
    if (isExclusionViolation(err)) {
      return { ok: false, code: "SLOT_TAKEN" };
    }
    throw err;
  }

  // 6. Audit + emails. Failures here don't roll back the booking.
  await safe(() =>
    writeAuditLog({
      actor: "public",
      action: "booking.create",
      entity: "booking",
      entityId: booking.id,
      payload: {
        serviceId: booking.service_id,
        customerId: booking.customer_id,
        startsAt: booking.starts_at,
      },
    }),
  );

  await safe(() => sendBookingEmails({
    booking,
    service,
    customer: {
      fullName: customerName,
      email: hasEmail ? customerEmail : "",
      phone: data.customer.phone ?? "",
      notes: data.customer.notes || undefined,
    },
  }));

  // They got a spot — close any open waitlist entry this booking fulfils.
  if (hasEmail) {
    await safe(() =>
      resolveWaitlistForCustomer({
        email: customerEmail,
        serviceId: data.serviceId,
      }),
    );
  }

  return { ok: true, bookingId: booking.id };
}

async function sendBookingEmails(args: {
  booking: { id: string; starts_at: string; ends_at: string };
  service: ServiceLookup;
  customer: {
    fullName: string;
    email: string;
    phone: string;
    notes?: string;
  };
}) {
  const mail = {
    bookingId: args.booking.id,
    startsAt: new Date(args.booking.starts_at),
    endsAt: new Date(args.booking.ends_at),
    serviceName: args.service.name,
    customer: args.customer,
  };
  // The customer confirmation needs a real e-mail; the admin notice
  // always goes out.
  const tasks: Array<Promise<void>> = [sendBookingAdminNotice(mail)];
  if (args.customer.email) tasks.push(sendBookingConfirmation(mail));
  await Promise.all(tasks);
}

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.error("[booking] post-insert step failed:", err);
    return null;
  }
}

export async function cancelBookingAction(id: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  const before = await safe(() => getBookingDetail(id));
  await dbCancelBooking(id);
  await safe(() =>
    writeAuditLog({
      actor: "admin",
      action: "booking.cancel",
      entity: "booking",
      entityId: id,
    }),
  );
  // Skip the mail/backfill if this was already a cancelled booking.
  if (before && before.status !== "cancelled") {
    if (before.customer?.email) {
      await safe(async () =>
        sendEmail({
          to: before.customer.email,
          context: "booking_cancelled_customer",
          ...(await bookingCancelledEmail({
            customerName: before.customer.full_name,
            serviceName: before.service.name,
            startsAt: new Date(before.starts_at),
          })),
        }),
      );
    }
    await safe(() => notifyWaitlistForFreedBooking(id));
  }
  return { ok: true };
}

export type CancelOwnResult =
  | { ok: true }
  | { ok: false; code: "INVALID" | "ALREADY" | "NOT_FOUND" };

export async function cancelOwnBooking(
  id: string,
  token: string,
): Promise<CancelOwnResult> {
  if (!token || !verifyBookingToken(id, token)) {
    return { ok: false, code: "INVALID" };
  }
  const booking = await getBookingDetail(id);
  if (!booking) return { ok: false, code: "NOT_FOUND" };
  if (booking.status === "cancelled") return { ok: false, code: "ALREADY" };

  await dbCancelBooking(id);

  await safe(() =>
    writeAuditLog({
      actor: "public",
      action: "booking.cancel",
      entity: "booking",
      entityId: id,
    }),
  );

  if (booking.customer?.email) {
    await safe(async () =>
      sendEmail({
        to: booking.customer.email,
        context: "booking_cancelled_customer",
        ...(await bookingCancelledEmail({
          customerName: booking.customer.full_name,
          serviceName: booking.service.name,
          startsAt: new Date(booking.starts_at),
        })),
      }),
    );
  }

  await safe(() =>
    recordAdminNotification({
      kind: "booking_cancelled",
      title: `Afspraak geannuleerd — ${booking.service.name}`,
      body: `${booking.customer.full_name} <${booking.customer.email}> heeft zelf geannuleerd. Het slot is weer vrij.`,
      href: `/boekingen/${booking.id}`,
    }),
  );

  await safe(() => notifyWaitlistForFreedBooking(id));

  return { ok: true };
}

export type RescheduleOwnResult =
  | { ok: true }
  | {
      ok: false;
      code: "INVALID" | "ALREADY" | "NOT_FOUND" | "PAST" | "SLOT_TAKEN";
    };

export async function rescheduleOwnBooking(
  id: string,
  token: string,
  startsAt: string,
  endsAt: string,
): Promise<RescheduleOwnResult> {
  if (!token || !verifyBookingToken(id, token)) {
    return { ok: false, code: "INVALID" };
  }
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start
  ) {
    return { ok: false, code: "INVALID" };
  }

  const booking = await getBookingDetail(id);
  if (!booking) return { ok: false, code: "NOT_FOUND" };
  if (booking.status === "cancelled") return { ok: false, code: "ALREADY" };
  if (new Date(booking.starts_at).getTime() <= Date.now()) {
    return { ok: false, code: "PAST" };
  }

  // Defence in depth: only allow a slot the canonical availability
  // algorithm actually offers for this service (opening hours, time_off,
  // overlaps, lead time) — never trust the times the client posted.
  const slots = await getAvailableSlots({
    staffId: booking.staff_id,
    serviceId: booking.service_id,
    date: formatIsoDate(start),
  });
  const offered = slots.some(
    (s) =>
      s.startsAt.toISOString() === start.toISOString() &&
      s.endsAt.toISOString() === end.toISOString(),
  );
  if (!offered) return { ok: false, code: "SLOT_TAKEN" };

  const svc = createSupabaseServiceClient();
  const { error } = await svc
    .from("bookings")
    .update({ starts_at: startsAt, ends_at: endsAt })
    .eq("id", id);
  if (error) {
    if (isExclusionViolation(error)) return { ok: false, code: "SLOT_TAKEN" };
    throw error;
  }

  await safe(() =>
    writeAuditLog({
      actor: "public",
      action: "booking.reschedule",
      entity: "booking",
      entityId: id,
      payload: { startsAt, endsAt },
    }),
  );

  await safe(() =>
    sendBookingRescheduled({
      bookingId: id,
      startsAt: start,
      endsAt: end,
      serviceName: booking.service.name,
      customer: {
        fullName: booking.customer.full_name,
        email: booking.customer.email,
        phone: booking.customer.phone ?? "",
      },
    }),
  );

  // The old slot just opened up — same backfill as a cancellation.
  // `booking` still holds the pre-move time/service.
  await safe(() =>
    notifyWaitlistForFreedSlot({
      serviceId: booking.service_id,
      startsAt: booking.starts_at,
    }),
  );

  return { ok: true };
}
