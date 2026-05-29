import Link from "next/link";
import type { Metadata } from "next";
import { loadDashboardKpis, listBookings } from "@/lib/db/admin-bookings";
import { loadInsights } from "@/lib/db/insights";
import { listInvoices } from "@/lib/db/invoices";
import { listOpenWaitlistInRange } from "@/lib/db/waitlist";
import {
  listTimeOffInRange,
  listOpeningHours,
  listSpecialOpenings,
} from "@/lib/db/admin-schedule";
import { getDefaultStaffId } from "@/lib/db/staff";
import { getSiteStringRecord } from "@/lib/db/site-content";
import { Card } from "@/components/ui/card";
import { AgendaTimeGrid } from "@/components/admin/agenda-time-grid";
import { groupByDay } from "@/lib/agenda-grid-data";
import { formatIsoDate } from "@/lib/time";
import { formatPrice } from "@/lib/db/services";
import {
  addDays,
  eachDayOfInterval,
  format,
  parseISO,
} from "date-fns";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const todayKey = formatIsoDate(new Date());
  const weekStart = parseISO(todayKey);
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6),
  });
  const weekFrom = format(weekStart, "yyyy-MM-dd");
  const weekTo = format(addDays(weekStart, 6), "yyyy-MM-dd");

  const [kpis, insights, invoices, weekBookings, weekWaitlist, staffId] =
    await Promise.all([
      loadDashboardKpis(),
      loadInsights(),
      listInvoices(8).catch(() => []),
      listBookings({ from: weekFrom, to: weekTo }),
      listOpenWaitlistInRange(weekFrom, weekTo),
      getDefaultStaffId(),
    ]);
  const weekTimeOff = await listTimeOffInRange(
    staffId,
    `${weekFrom}T00:00:00Z`,
    `${weekTo}T23:59:59Z`,
  ).catch(() => []);
  const openingHours = await listOpeningHours(staffId).catch(() => []);
  const openingBlocks = openingHours.map((h) => ({
    weekday: h.weekday,
    start: h.start_time.slice(0, 5),
    end: h.end_time.slice(0, 5),
  }));
  const serviceColors = await getSiteStringRecord("agenda.service_colors");
  const specialOpenings = await listSpecialOpenings().catch(() => []);

  const byDay = groupByDay(weekBookings);
  const waitlistByDay = new Map<string, string[]>();
  for (const w of weekWaitlist) {
    const arr = waitlistByDay.get(w.preferred_date);
    if (arr) arr.push(w.full_name);
    else waitlistByDay.set(w.preferred_date, [w.full_name]);
  }

  const maxRevenue = Math.max(
    1,
    ...insights.revenueWeeks.map((w) => w.cents),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Vandaag" value={String(kpis.bookingsToday)} />
        <Kpi label="Omzet deze week" value={formatPrice(kpis.weekRevenueCents)} />
        <Kpi label="No-shows (30d)" value={String(kpis.noShowsLast30Days)} />
      </section>

      <section className="mt-6 flex flex-wrap gap-2">
        <QuickAction href="/agenda" label="Agenda" />
        <QuickAction href="/boekingen/nieuw" label="Nieuwe boeking" />
        <QuickAction href="/boekingen" label="Alle boekingen" />
        <QuickAction href="/boekingen/dag" label="Dagstaat" />
        <QuickAction href="/facturen" label="Facturen" />
        <QuickAction href="/instellingen/vrije-dagen" label="Vrije dag blokkeren" />
        <QuickAction href="/instellingen/openingstijden" label="Openingstijden" />
        <QuickAction href="/instellingen/diensten" label="Diensten" />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold">Omzet per week</h2>
          <p className="text-xs text-muted-foreground">
            Bevestigde en afgeronde afspraken, laatste 6 weken.
          </p>
          <div className="mt-6 flex h-40 items-end gap-3">
            {insights.revenueWeeks.map((w) => (
              <div key={w.weekStart} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-32 w-full items-end">
                  <div
                    className="w-full rounded-t bg-primary/80"
                    style={{
                      height: `${Math.round((w.cents / maxRevenue) * 100)}%`,
                    }}
                    title={formatPrice(w.cents)}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {format(parseISO(w.weekStart), "d/M")}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold">Kerncijfers</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                No-showpercentage (30d)
              </dt>
              <dd className="mt-1 text-2xl font-semibold">
                {Math.round(insights.noShowRate * 100)}%
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  van {insights.noShowSample}
                </span>
              </dd>
            </div>
          </dl>
        </Card>
      </section>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Agenda — komende 7 dagen
          </h2>
          <Link
            href="/agenda"
            className="text-xs text-muted-foreground underline underline-offset-4"
          >
            Volledige agenda (maand/week/dag)
          </Link>
        </div>
        <AgendaTimeGrid
          days={weekDays}
          byDay={byDay}
          waitlistByDay={waitlistByDay}
          todayKey={todayKey}
          timeOff={weekTimeOff}
          openingHours={openingBlocks}
          specialOpenings={specialOpenings}
          serviceColors={serviceColors}
        />
      </div>

      <Card className="mt-8 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recente facturen</h2>
          <Link
            href="/facturen"
            className="text-xs text-muted-foreground underline underline-offset-4"
          >
            Alle facturen
          </Link>
        </div>
        {invoices.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Nog geen facturen.
          </p>
        ) : (
          <ul className="mt-4 divide-y text-sm">
            {invoices.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/facturen/${inv.id}`}
                  className="flex items-center justify-between gap-3 py-2 hover:text-foreground/70"
                >
                  <span className="font-medium">{inv.number}</span>
                  <span className="truncate text-muted-foreground">
                    {inv.customer_name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {inv.issued_on}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatPrice(inv.total_cents)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium hover:bg-accent"
    >
      {label}
    </Link>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </Card>
  );
}
