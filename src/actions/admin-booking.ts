"use server";

import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import {
  writeAuditLog,
  insertBooking,
  isExclusionViolation,
  getBookingDetail,
  deleteBooking,
  deleteBookings,
  deleteAllBookings,
} from "@/lib/db/bookings";
import { cancelBookingAction } from "@/actions/booking";
import { upsertCustomerByEmail } from "@/lib/db/customers";
import { dismissNoShowFlag } from "@/lib/db/no-show";
import { getEmailLogEntry, deleteEmailLog } from "@/lib/db/email-log";
import { sendEmail } from "@/lib/email/client";
import {
  sendBookingConfirmation,
  sendBookingAdminNotice,
  sendBookingRescheduled,
} from "@/lib/email/booking-emails";
import { notifyWaitlistForFreedSlot } from "@/lib/waitlist-backfill";
import { customerInputSchema } from "@/lib/schemas/booking";
import { requireAdmin } from "@/lib/auth/require-admin";
import { uuidString } from "@/lib/schemas/uuid";

const statusSchema = z.enum([
  "pending",
  "confirmed",
  "cancelled",
  "no_show",
  "completed",
]);

export async function updateBookingStatusAction(
  id: string,
  rawStatus: string,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const status = statusSchema.parse(rawStatus);

  // Cancelling has side effects (customer mail + waitlist backfill);
  // reuse the single source of truth instead of just flipping status.
  if (status === "cancelled") {
    return cancelBookingAction(id);
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", id);
  if (error) throw error;

  await writeAuditLog({
    actor: "admin",
    action: "booking.status_change",
    entity: "booking",
    entityId: id,
    payload: { status },
  }).catch(() => {});

  return { ok: true };
}

export async function deleteBookingAction(
  id: string,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const parsed = uuidString().safeParse(id);
  if (!parsed.success) return { ok: false };

  try {
    await deleteBooking(parsed.data);
  } catch (err) {
    console.error("[admin-booking] delete failed:", err);
    return { ok: false };
  }

  await writeAuditLog({
    actor: "admin",
    action: "booking.delete",
    entity: "booking",
    entityId: parsed.data,
    payload: {},
  }).catch(() => {});

  revalidatePath("/boekingen");
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteBookingsAction(
  ids: unknown,
): Promise<{ ok: boolean; deleted?: number }> {
  await requireAdmin();
  const parsed = z.array(uuidString()).min(1).max(500).safeParse(ids);
  if (!parsed.success) return { ok: false };

  let deleted: number;
  try {
    deleted = await deleteBookings(parsed.data);
  } catch (err) {
    console.error("[admin-booking] delete selected failed:", err);
    return { ok: false };
  }

  await writeAuditLog({
    actor: "admin",
    action: "booking.delete_selected",
    entity: "booking",
    entityId: "00000000-0000-0000-0000-000000000000",
    payload: { count: deleted },
  }).catch(() => {});

  revalidatePath("/boekingen");
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { ok: true, deleted };
}

const notesSchema = z.string().max(2000);

export async function updateBookingNotesAction(
  id: string,
  rawNotes: string,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const trimmed = notesSchema.parse(rawNotes).trim();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("bookings")
    .update({ notes: trimmed || null })
    .eq("id", id);
  if (error) throw error;

  await writeAuditLog({
    actor: "admin",
    action: "booking.notes_update",
    entity: "booking",
    entityId: id,
    payload: { length: trimmed.length },
  }).catch(() => {});

  return { ok: true };
}

export async function dismissNoShowFlagAction(
  customerId: string,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  try {
    await dismissNoShowFlag(customerId);
  } catch (err) {
    console.error("[no-show] dismiss failed:", err);
    return { ok: false };
  }
  await writeAuditLog({
    actor: "admin",
    action: "customer.no_show_ack",
    entity: "customer",
    entityId: customerId,
    payload: {},
  }).catch(() => {});
  return { ok: true };
}

export async function resendEmailAction(
  id: number,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const entry = await getEmailLogEntry(id);
  if (!entry) return { ok: false };
  try {
    await sendEmail({
      to: entry.to_email,
      subject: entry.subject,
      text: entry.body,
      context: `resend:${entry.context ?? "onbekend"}`,
    });
  } catch (err) {
    console.error("[email] resend failed:", err);
    return { ok: false };
  }
  return { ok: true };
}

export async function deleteEmailLogAction(
  ids: unknown,
): Promise<{ ok: boolean; deleted?: number }> {
  await requireAdmin();
  const parsed = z
    .array(z.number().int().positive())
    .min(1)
    .max(500)
    .safeParse(ids);
  if (!parsed.success) return { ok: false };

  let deleted: number;
  try {
    deleted = await deleteEmailLog(parsed.data);
  } catch (err) {
    console.error("[email] delete failed:", err);
    return { ok: false };
  }

  revalidatePath("/instellingen/e-mails");
  return { ok: true, deleted };
}

const adminBookingSchema = z.object({
  serviceId: uuidString(),
  staffId: uuidString(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  customer: customerInputSchema,
});

export type CreateAdminBookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; code: "INVALID_INPUT" | "SLOT_TAKEN" | "INTERNAL"; message?: string };

export async function createAdminBooking(
  input: unknown,
): Promise<CreateAdminBookingResult> {
  await requireAdmin();
  const parsed = adminBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "INVALID_INPUT", message: parsed.error.message };
  }
  const data = parsed.data;
  if (new Date(data.endsAt) <= new Date(data.startsAt)) {
    return { ok: false, code: "INVALID_INPUT", message: "Eindtijd ligt voor de starttijd" };
  }

  // Contact details are optional — fall back to a placeholder e-mail.
  const idem = uuidv4();
  const adminEmail = (data.customer.email ?? "").trim();
  const hasEmail = adminEmail.length > 0;
  const customerName =
    (data.customer.fullName ?? "").trim() || "Onbekende klant";
  const customer = await upsertCustomerByEmail({
    email: hasEmail ? adminEmail : `${idem}@geen-email.invalid`,
    full_name: customerName,
    phone: data.customer.phone || undefined,
  });

  let booking;
  try {
    booking = await insertBooking({
      staffId: data.staffId,
      serviceId: data.serviceId,
      customerId: customer.id,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      notes: data.customer.notes || undefined,
      idempotencyKey: idem,
    });
  } catch (err) {
    if (isExclusionViolation(err)) return { ok: false, code: "SLOT_TAKEN" };
    throw err;
  }

  const svc = createSupabaseServiceClient();
  const { data: service } = await svc
    .from("services")
    .select("name")
    .eq("id", data.serviceId)
    .maybeSingle();
  const serviceName = (service as { name?: string } | null)?.name ?? "Afspraak";

  await writeAuditLog({
    actor: "admin",
    action: "booking.create",
    entity: "booking",
    entityId: booking.id,
    payload: { manual: true },
  }).catch(() => {});

  const mail = {
    bookingId: booking.id,
    startsAt: new Date(booking.starts_at),
    endsAt: new Date(booking.ends_at),
    serviceName,
    customer: {
      fullName: customerName,
      email: hasEmail ? adminEmail : "",
      phone: data.customer.phone ?? "",
      notes: data.customer.notes || undefined,
    },
  };
  try {
    if (hasEmail) await sendBookingConfirmation(mail);
    await sendBookingAdminNotice(mail);
  } catch (err) {
    console.error("[admin-booking] email failed:", err);
  }

  return { ok: true, bookingId: booking.id };
}

const rescheduleSchema = z.object({
  id: uuidString(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

export type RescheduleResult =
  | { ok: true }
  | { ok: false; code: "INVALID_INPUT" | "SLOT_TAKEN" | "NOT_FOUND" };

export async function rescheduleBooking(
  input: unknown,
): Promise<RescheduleResult> {
  await requireAdmin();
  const parsed = rescheduleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const { id, startsAt, endsAt } = parsed.data;
  if (new Date(endsAt) <= new Date(startsAt)) {
    return { ok: false, code: "INVALID_INPUT" };
  }

  const before = await getBookingDetail(id);
  if (!before) return { ok: false, code: "NOT_FOUND" };

  const svc = createSupabaseServiceClient();
  const { error } = await svc
    .from("bookings")
    .update({ starts_at: startsAt, ends_at: endsAt })
    .eq("id", id);
  if (error) {
    if (isExclusionViolation(error)) return { ok: false, code: "SLOT_TAKEN" };
    throw error;
  }

  await writeAuditLog({
    actor: "admin",
    action: "booking.reschedule",
    entity: "booking",
    entityId: id,
    payload: { startsAt, endsAt },
  }).catch(() => {});

  try {
    await sendBookingRescheduled({
      bookingId: id,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      serviceName: before.service.name,
      customer: {
        fullName: before.customer.full_name,
        email: before.customer.email,
        phone: before.customer.phone ?? "",
      },
    });
  } catch (err) {
    console.error("[admin-booking] reschedule email failed:", err);
  }

  // `before` still holds the pre-move time/service — the old slot is
  // now free, so run the same waitlist backfill as a cancellation.
  try {
    await notifyWaitlistForFreedSlot({
      serviceId: before.service_id,
      startsAt: before.starts_at,
    });
  } catch (err) {
    console.error("[admin-booking] reschedule backfill failed:", err);
  }

  return { ok: true };
}

const durationSchema = z.object({
  id: uuidString(),
  durationMin: z.number().int().min(15).max(480),
});

export type UpdateDurationResult =
  | { ok: true }
  | { ok: false; code: "INVALID_INPUT" | "NOT_FOUND" | "SLOT_TAKEN" };

/**
 * Changes only the length of an appointment — the start stays put, the
 * end moves. No customer e-mail: the visit time is unchanged.
 */
export async function updateBookingDurationAction(
  input: unknown,
): Promise<UpdateDurationResult> {
  await requireAdmin();
  const parsed = durationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const { id, durationMin } = parsed.data;

  const before = await getBookingDetail(id);
  if (!before) return { ok: false, code: "NOT_FOUND" };

  const endsAt = new Date(
    new Date(before.starts_at).getTime() + durationMin * 60_000,
  ).toISOString();

  const svc = createSupabaseServiceClient();
  const { error } = await svc
    .from("bookings")
    .update({ ends_at: endsAt })
    .eq("id", id);
  if (error) {
    if (isExclusionViolation(error)) return { ok: false, code: "SLOT_TAKEN" };
    throw error;
  }

  await writeAuditLog({
    actor: "admin",
    action: "booking.duration_change",
    entity: "booking",
    entityId: id,
    payload: { durationMin },
  }).catch(() => {});

  revalidatePath("/boekingen");
  revalidatePath(`/boekingen/${id}`);
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { ok: true };
}

const paymentSchema = z.object({
  id: uuidString(),
  paid: z.boolean(),
  method: z.enum(["contant", "pin", "overboeking", "factuur", ""]).optional(),
  amountCents: z.number().int().min(0).max(10_000_00).optional(),
});

export async function setBookingPaymentAction(
  input: unknown,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { id, paid, method, amountCents } = parsed.data;
  const svc = createSupabaseServiceClient();
  const { error } = await svc
    .from("bookings")
    .update({
      paid,
      paid_method: paid ? method || null : null,
      paid_amount_cents: paid ? (amountCents ?? null) : null,
      paid_at: paid ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) {
    console.error("[payment] update failed:", error);
    return { ok: false };
  }
  await writeAuditLog({
    actor: "admin",
    action: "booking.payment",
    entity: "booking",
    entityId: id,
    payload: { paid, method },
  }).catch(() => {});
  return { ok: true };
}

const BULK_DELETE_PHRASE = "VERWIJDER";

/**
 * Hard-deletes EVERY booking. Irreversible — also empties the finance
 * overview. Double-guarded: admin only, plus an exact confirmation
 * phrase checked server-side too.
 */
export async function deleteAllBookingsAction(
  confirm: string,
): Promise<{ ok: boolean; deleted?: number }> {
  await requireAdmin();
  if (confirm !== BULK_DELETE_PHRASE) return { ok: false };

  let deleted: number;
  try {
    deleted = await deleteAllBookings();
  } catch (err) {
    console.error("[admin-booking] bulk delete failed:", err);
    return { ok: false };
  }

  await writeAuditLog({
    actor: "admin",
    action: "booking.bulk_delete",
    entity: "booking",
    entityId: "00000000-0000-0000-0000-000000000000",
    payload: { deleted },
  }).catch(() => {});

  revalidatePath("/boekingen");
  revalidatePath("/dashboard");
  revalidatePath("/");
  return { ok: true, deleted };
}
