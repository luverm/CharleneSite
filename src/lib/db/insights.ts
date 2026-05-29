import "server-only";
import { startOfWeek, format, parseISO, subWeeks } from "date-fns";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { formatIsoDate } from "@/lib/time";

export type WeekRevenue = { weekStart: string; cents: number };

export type Insights = {
  revenueWeeks: WeekRevenue[];
  noShowRate: number; // 0..1 over the last 30 days
  noShowSample: number; // how many bookings the rate is based on
};

export async function loadInsights(): Promise<Insights> {
  const svc = createSupabaseServiceClient();
  const now = new Date();
  const sixWeeksAgo = subWeeks(now, 6).toISOString();
  const thirtyDaysAgo = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [revRes, nsRes] = await Promise.all([
    svc
      .from("bookings")
      .select("starts_at, status, service:services(price_cents)")
      .in("status", ["confirmed", "completed"])
      .gte("starts_at", sixWeeksAgo),
    svc
      .from("bookings")
      .select("status")
      .gte("starts_at", thirtyDaysAgo)
      .in("status", ["no_show", "completed", "confirmed"]),
  ]);

  if (revRes.error) throw revRes.error;
  if (nsRes.error) throw nsRes.error;

  // Revenue grouped into Monday-anchored weeks (last 6).
  const buckets = new Map<string, number>();
  for (let i = 5; i >= 0; i -= 1) {
    const ws = format(
      startOfWeek(subWeeks(now, i), { weekStartsOn: 1 }),
      "yyyy-MM-dd",
    );
    buckets.set(ws, 0);
  }
  for (const row of (revRes.data ?? []) as Array<{
    starts_at: string;
    service: { price_cents: number } | { price_cents: number }[] | null;
  }>) {
    const localDay = formatIsoDate(new Date(row.starts_at));
    const ws = format(
      startOfWeek(parseISO(localDay), { weekStartsOn: 1 }),
      "yyyy-MM-dd",
    );
    if (!buckets.has(ws)) continue;
    const svcRow = Array.isArray(row.service) ? row.service[0] : row.service;
    buckets.set(ws, (buckets.get(ws) ?? 0) + (svcRow?.price_cents ?? 0));
  }
  const revenueWeeks: WeekRevenue[] = [...buckets.entries()].map(
    ([weekStart, cents]) => ({ weekStart, cents }),
  );

  const nsRows = (nsRes.data ?? []) as Array<{ status: string }>;
  const noShow = nsRows.filter((r) => r.status === "no_show").length;
  const noShowSample = nsRows.length;
  const noShowRate = noShowSample === 0 ? 0 : noShow / noShowSample;

  return {
    revenueWeeks,
    noShowRate,
    noShowSample,
  };
}
