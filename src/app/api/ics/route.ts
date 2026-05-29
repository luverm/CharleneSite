import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import * as ics from "ics";
import { getServerEnv } from "@/lib/env";
import { listUpcomingBookings } from "@/lib/db/admin-bookings";
import { business } from "@/content/business";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dateToArray(iso: string): [number, number, number, number, number] {
  const d = new Date(iso);
  return [
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
  ];
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function GET(request: NextRequest) {
  const { ADMIN_ICS_TOKEN } = getServerEnv();
  const token = request.nextUrl.searchParams.get("token");
  if (!token || !safeEqual(token, ADMIN_ICS_TOKEN)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const bookings = await listUpcomingBookings();

  const events = bookings.map((b) => ({
    uid: `booking-${b.id}@charlene`,
    title: `${b.service?.name ?? "Boeking"} — ${b.customer?.full_name ?? ""}`,
    description: [
      b.customer?.email && `E-mail: ${b.customer.email}`,
      b.customer?.phone && `Tel: ${b.customer.phone}`,
      b.notes && `Notitie: ${b.notes}`,
    ]
      .filter(Boolean)
      .join("\n"),
    start: dateToArray(b.starts_at),
    startInputType: "utc" as const,
    end: dateToArray(b.ends_at),
    endInputType: "utc" as const,
    organizer: { name: business.name, email: business.email },
    status:
      b.status === "cancelled"
        ? ("CANCELLED" as const)
        : ("CONFIRMED" as const),
    productId: "charlene/admin-feed",
  }));

  const { error, value } = ics.createEvents(events);
  if (error || !value) {
    return new NextResponse("Failed to generate calendar", { status: 500 });
  }

  return new NextResponse(value, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Disposition": 'inline; filename="charlene.ics"',
    },
  });
}
