import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { listDueReminders, markReminderSent } from "@/lib/db/reminders";
import { listRebookingDue, markRebookingNudged } from "@/lib/db/rebooking";
import {
  listDueReviewRequests,
  markReviewRequestSent,
} from "@/lib/db/review-requests";
import { purgeOldThreads } from "@/lib/db/chat";
import { deleteChatImages } from "@/lib/chat-images";
import { sendEmail } from "@/lib/email/client";
import {
  bookingReminderEmail,
  rebookingNudgeEmail,
  reviewRequestEmail,
} from "@/lib/email/messages";
import { signBooking } from "@/lib/booking-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function authorized(request: NextRequest): boolean {
  // Vercel Cron sends "Authorization: Bearer <CRON_SECRET>". A dedicated
  // secret only — no fallback to the ICS token, which travels in the
  // calendar-subscription URL and must not be able to trigger mail.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const auth = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!auth.startsWith(prefix)) return false;
  return safeEqual(auth.slice(prefix.length), cronSecret);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let due;
  try {
    due = await listDueReminders();
  } catch (err) {
    console.error("[cron/reminders] query failed:", err);
    return NextResponse.json(
      { ok: false, reason: "query_failed" },
      { status: 200 },
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  let sent = 0;
  let failed = 0;

  for (const b of due) {
    if (!b.customer?.email) continue;
    try {
      await sendEmail({
        to: b.customer.email,
        context: "booking_reminder",
        ...(await bookingReminderEmail({
          customerName: b.customer.full_name,
          serviceName: b.service?.name ?? "Afspraak",
          startsAt: new Date(b.starts_at),
          cancelUrl: `${siteUrl}/afspraak/${b.id}?token=${signBooking(b.id)}`,
        })),
      });
      await markReminderSent(b.id);
      sent += 1;
    } catch (err) {
      console.error(`[cron/reminders] booking ${b.id} failed:`, err);
      failed += 1;
    }
  }

  // "Tijd voor een nieuwe afspraak"-mail naar klanten die al een tijd
  // niet zijn geweest en geen toekomstige afspraak hebben. De cooldown
  // in de query houdt dit idempotent over dagelijkse runs heen.
  let rebookSent = 0;
  let rebookFailed = 0;
  try {
    const dueRebook = await listRebookingDue();
    for (const c of dueRebook) {
      if (!c.email) continue;
      try {
        await sendEmail({
          to: c.email,
          context: "rebooking_nudge",
          ...(await rebookingNudgeEmail({
            customerName: c.full_name,
            lastServiceName: c.last_service,
            bookingUrl: `${siteUrl}/boeken`,
          })),
        });
        await markRebookingNudged(c.customer_id);
        rebookSent += 1;
      } catch (err) {
        console.error(
          `[cron/reminders] rebooking ${c.customer_id} failed:`,
          err,
        );
        rebookFailed += 1;
      }
    }
  } catch (err) {
    console.error("[cron/reminders] rebooking query failed:", err);
  }

  // Vraag na het bezoek om een review. Eenmalig per boeking via
  // review_request_sent_at; de link is met een token beveiligd.
  let reviewSent = 0;
  let reviewFailed = 0;
  try {
    const dueReviews = await listDueReviewRequests();
    for (const b of dueReviews) {
      if (!b.customer?.email) continue;
      try {
        await sendEmail({
          to: b.customer.email,
          context: "review_request",
          ...(await reviewRequestEmail({
            customerName: b.customer.full_name,
            serviceName: b.service?.name ?? "je afspraak",
            reviewUrl: `${siteUrl}/review/${b.id}?token=${signBooking(b.id)}`,
          })),
        });
        await markReviewRequestSent(b.id);
        reviewSent += 1;
      } catch (err) {
        console.error(`[cron/reminders] review ${b.id} failed:`, err);
        reviewFailed += 1;
      }
    }
  } catch (err) {
    console.error("[cron/reminders] review query failed:", err);
  }

  // Chat retention: drop conversations idle > 30 days unless kept.
  let chatPurged = 0;
  try {
    const { threads, imagePaths } = await purgeOldThreads(30);
    chatPurged = threads;
    if (imagePaths.length > 0) await deleteChatImages(imagePaths);
  } catch (err) {
    console.error("[cron/reminders] chat purge failed:", err);
  }

  return NextResponse.json({
    ok: true,
    considered: due.length,
    sent,
    failed,
    rebooking: { sent: rebookSent, failed: rebookFailed },
    reviews: { sent: reviewSent, failed: reviewFailed },
    chat: { purged: chatPurged },
  });
}
