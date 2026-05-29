"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  createReview,
  createCustomerReview,
  createPublicReview,
  hasReviewForBooking,
  setReviewVisible,
  deleteReview,
} from "@/lib/db/reviews";
import { verifyBookingToken } from "@/lib/booking-token";
import { getBookingDetail } from "@/lib/db/bookings";
import { requireAdmin } from "@/lib/auth/require-admin";

const schema = z.object({
  author: z.string().trim().min(2).max(120),
  quote: z.string().trim().min(4).max(600),
});

export async function createReviewAction(
  formData: FormData,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const parsed = schema.safeParse({
    author: formData.get("author"),
    quote: formData.get("quote"),
  });
  if (!parsed.success) return { ok: false };
  try {
    await createReview(parsed.data);
  } catch (err) {
    console.error("[review] create failed:", err);
    return { ok: false };
  }
  return { ok: true };
}

export async function setReviewVisibleAction(
  id: string,
  visible: boolean,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  try {
    await setReviewVisible(id, visible);
  } catch {
    return { ok: false };
  }
  return { ok: true };
}

export async function deleteReviewAction(
  id: string,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  try {
    await deleteReview(id);
  } catch {
    return { ok: false };
  }
  return { ok: true };
}

const publicSubmitSchema = z.object({
  author: z.string().trim().min(2).max(120),
  quote: z.string().trim().min(4).max(600),
  website: z.string().max(0).optional().or(z.literal("")),
});

export type SubmitPublicReviewResult =
  | { ok: true }
  | { ok: false; code: "INPUT" };

/**
 * Open review submitted from the website. Stored hidden, so Jeanine
 * approves it before it appears. Honeypot drops bots silently.
 */
export async function submitPublicReviewAction(
  input: unknown,
): Promise<SubmitPublicReviewResult> {
  const parsed = publicSubmitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INPUT" };
  const { author, quote, website } = parsed.data;
  if (website) return { ok: true };

  try {
    await createPublicReview({ author, quote });
  } catch (err) {
    console.error("[review] public submit failed:", err);
    return { ok: false, code: "INPUT" };
  }
  revalidatePath("/instellingen/reviews");
  return { ok: true };
}

const submitSchema = z.object({
  bookingId: z.string().uuid(),
  token: z.string().min(1),
  author: z.string().trim().min(2).max(120),
  quote: z.string().trim().min(4).max(600),
  website: z.string().max(0).optional().or(z.literal("")),
});

export type SubmitReviewResult =
  | { ok: true }
  | { ok: false; code: "INVALID" | "NOT_ELIGIBLE" | "ALREADY" | "INPUT" };

export async function submitReviewAction(
  input: unknown,
): Promise<SubmitReviewResult> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INPUT" };
  const { bookingId, token, author, quote, website } = parsed.data;

  // Honeypot — pretend success so bots don't probe.
  if (website) return { ok: true };

  if (!verifyBookingToken(bookingId, token)) {
    return { ok: false, code: "INVALID" };
  }

  const booking = await getBookingDetail(bookingId);
  if (!booking) return { ok: false, code: "INVALID" };

  // Only a real, finished visit can be reviewed.
  const ended = new Date(booking.ends_at).getTime();
  const visited =
    (booking.status === "confirmed" || booking.status === "completed") &&
    ended <= Date.now();
  if (!visited) return { ok: false, code: "NOT_ELIGIBLE" };

  try {
    if (await hasReviewForBooking(bookingId)) {
      return { ok: false, code: "ALREADY" };
    }
    await createCustomerReview({ bookingId, author, quote });
  } catch (err) {
    // Unique index races (double submit) land here too.
    if (await hasReviewForBooking(bookingId).catch(() => false)) {
      return { ok: false, code: "ALREADY" };
    }
    console.error("[review] submit failed:", err);
    return { ok: false, code: "INPUT" };
  }
  return { ok: true };
}
