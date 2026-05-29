import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { BookingRow } from "@/lib/db/bookings";

export type BookingListItem = BookingRow & {
  service: { name: string; price_cents: number; kind: string } | null;
  customer: {
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
};

export type ListBookingsArgs = {
  /** ISO date YYYY-MM-DD inclusive. */
  from?: string;
  /** ISO date YYYY-MM-DD inclusive. */
  to?: string;
  status?: BookingRow["status"];
  serviceId?: string;
  /** Free-text search on customer name or email (case-insensitive). */
  q?: string;
};

export async function listBookings(
  args: ListBookingsArgs = {},
): Promise<BookingListItem[]> {
  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from("bookings")
    .select(
      `
      *,
      service:services(name, price_cents, kind),
      customer:customers(full_name, email, phone)
      `,
    )
    .order("starts_at", { ascending: false });

  if (args.from) query = query.gte("starts_at", `${args.from}T00:00:00Z`);
  if (args.to) query = query.lte("starts_at", `${args.to}T23:59:59Z`);
  if (args.status) query = query.eq("status", args.status);
  if (args.serviceId) query = query.eq("service_id", args.serviceId);

  const { data, error } = await query;
  if (error) throw error;

  let rows = (data ?? []) as BookingListItem[];

  if (args.q) {
    const needle = args.q.toLowerCase();
    rows = rows.filter((row) => {
      const c = row.customer;
      if (!c) return false;
      return (
        c.full_name.toLowerCase().includes(needle) ||
        c.email.toLowerCase().includes(needle)
      );
    });
  }

  return rows;
}

export type DashboardKpis = {
  bookingsToday: number;
  weekRevenueCents: number;
  noShowsLast30Days: number;
};

export async function loadDashboardKpis(): Promise<DashboardKpis> {
  const supabase = createSupabaseServiceClient();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [todayRes, weekRes, noShowRes] = await Promise.all([
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .gte("starts_at", todayStart.toISOString())
      .lt("starts_at", todayEnd.toISOString())
      .in("status", ["pending", "confirmed", "completed"]),
    supabase
      .from("bookings")
      .select("service:services(price_cents)")
      .gte("starts_at", weekStart.toISOString())
      .lte("starts_at", todayEnd.toISOString())
      .in("status", ["confirmed", "completed"]),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .gte("starts_at", thirtyDaysAgo.toISOString())
      .eq("status", "no_show"),
  ]);

  if (todayRes.error) throw todayRes.error;
  if (weekRes.error) throw weekRes.error;
  if (noShowRes.error) throw noShowRes.error;

  const weekRevenueCents = ((weekRes.data ?? []) as Array<{
    service: { price_cents: number } | { price_cents: number }[] | null;
  }>).reduce((acc, row) => {
    const svc = Array.isArray(row.service) ? row.service[0] : row.service;
    return acc + (svc?.price_cents ?? 0);
  }, 0);

  return {
    bookingsToday: todayRes.count ?? 0,
    weekRevenueCents,
    noShowsLast30Days: noShowRes.count ?? 0,
  };
}

export async function listTodaysAgenda(): Promise<BookingListItem[]> {
  const supabase = createSupabaseServiceClient();
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      service:services(name, price_cents, kind),
      customer:customers(full_name, email, phone)
      `,
    )
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .in("status", ["pending", "confirmed"])
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as BookingListItem[];
}

export async function listUpcomingBookings(): Promise<BookingListItem[]> {
  const supabase = createSupabaseServiceClient();
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      service:services(name, price_cents, kind),
      customer:customers(full_name, email, phone)
      `,
    )
    .gte("starts_at", start.toISOString())
    .in("status", ["pending", "confirmed"])
    .order("starts_at", { ascending: true })
    .limit(500);

  if (error) throw error;
  return (data ?? []) as BookingListItem[];
}
