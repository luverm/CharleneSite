import Link from "next/link";
import type { Metadata } from "next";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { listBookings, type BookingListItem } from "@/lib/db/admin-bookings";
import { listOpenWaitlistInRange } from "@/lib/db/waitlist";
import {
  listTimeOffInRange,
  listOpeningHours,
  listSpecialOpenings,
  type TimeOffRow,
} from "@/lib/db/admin-schedule";
import { getDefaultStaffId } from "@/lib/db/staff";
import { getSiteStringRecord } from "@/lib/db/site-content";
import { formatIsoDate, formatTime } from "@/lib/time";
import { AgendaTimeGrid } from "@/components/admin/agenda-time-grid";
import {
  groupByDay,
  timeOffSegmentsForDay,
} from "@/lib/agenda-grid-data";

export const metadata: Metadata = {
  title: "Agenda",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const WEEKDAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const WEEKDAYS_LONG = [
  "maandag",
  "dinsdag",
  "woensdag",
  "donderdag",
  "vrijdag",
  "zaterdag",
  "zondag",
];
const MONTHS_NL = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

const DOT: Record<string, string> = {
  confirmed: "bg-emerald-500",
  pending: "bg-amber-500",
  completed: "bg-sky-500",
  no_show: "bg-rose-500",
};

type View = "maand" | "week" | "dag";

function anchorDate(date?: string): Date {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const d = parseISO(date);
    if (isValid(d)) return d;
  }
  return parseISO(formatIsoDate(new Date()));
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const view: View =
    sp.view === "week" || sp.view === "dag" ? sp.view : "maand";
  const anchor = anchorDate(sp.date);
  const todayKey = formatIsoDate(new Date());

  let rangeStart: Date;
  let rangeEnd: Date;
  if (view === "maand") {
    rangeStart = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
    rangeEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
  } else if (view === "week") {
    rangeStart = startOfWeek(anchor, { weekStartsOn: 1 });
    rangeEnd = endOfWeek(anchor, { weekStartsOn: 1 });
  } else {
    rangeStart = anchor;
    rangeEnd = anchor;
  }

  const fromKey = format(rangeStart, "yyyy-MM-dd");
  const toKey = format(rangeEnd, "yyyy-MM-dd");
  const [bookings, waitlist, staffId] = await Promise.all([
    listBookings({ from: fromKey, to: toKey }),
    listOpenWaitlistInRange(fromKey, toKey),
    getDefaultStaffId(),
  ]);
  const timeOff = await listTimeOffInRange(
    staffId,
    `${fromKey}T00:00:00Z`,
    `${toKey}T23:59:59Z`,
  ).catch(() => []);
  const openingHours = await listOpeningHours(staffId).catch(() => []);
  const openingBlocks = openingHours.map((h) => ({
    weekday: h.weekday,
    start: h.start_time.slice(0, 5),
    end: h.end_time.slice(0, 5),
  }));
  const serviceColors = await getSiteStringRecord("agenda.service_colors");
  const specialOpenings = await listSpecialOpenings().catch(() => []);
  const byDay = groupByDay(bookings);

  const waitlistByDay = new Map<string, string[]>();
  for (const w of waitlist) {
    const arr = waitlistByDay.get(w.preferred_date);
    if (arr) arr.push(w.full_name);
    else waitlistByDay.set(w.preferred_date, [w.full_name]);
  }

  const step = (n: number): string => {
    const d =
      view === "maand"
        ? addMonths(anchor, n)
        : addDays(anchor, view === "week" ? n * 7 : n);
    return format(d, "yyyy-MM-dd");
  };
  const link = (v: View, date: string) => `/agenda?view=${v}&date=${date}`;

  let title: string;
  if (view === "maand") {
    title = `${MONTHS_NL[Number(format(anchor, "M")) - 1]} ${format(anchor, "yyyy")}`;
  } else if (view === "week") {
    const sameMonth = format(rangeStart, "M") === format(rangeEnd, "M");
    title = sameMonth
      ? `${format(rangeStart, "d")} – ${format(rangeEnd, "d")} ${MONTHS_NL[Number(format(rangeEnd, "M")) - 1]} ${format(rangeEnd, "yyyy")}`
      : `${format(rangeStart, "d")} ${MONTHS_NL[Number(format(rangeStart, "M")) - 1]} – ${format(rangeEnd, "d")} ${MONTHS_NL[Number(format(rangeEnd, "M")) - 1]} ${format(rangeEnd, "yyyy")}`;
  } else {
    title = `${WEEKDAYS_LONG[Number(format(anchor, "i")) - 1]} ${format(anchor, "d")} ${MONTHS_NL[Number(format(anchor, "M")) - 1]} ${format(anchor, "yyyy")}`;
  }

  const gridDays =
    view === "week"
      ? eachDayOfInterval({ start: rangeStart, end: addDays(rangeStart, 6) })
      : [anchor];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Agenda</h1>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border p-0.5">
          {(["maand", "week", "dag"] as View[]).map((v) => (
            <Link
              key={v}
              href={link(v, formatIsoDate(anchor))}
              className={
                "rounded px-3 py-1.5 text-sm capitalize transition " +
                (v === view
                  ? "bg-foreground text-background"
                  : "hover:bg-accent")
              }
            >
              {v}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Link
            href={link(view, step(-1))}
            aria-label="Vorige"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background hover:bg-accent"
          >
            ‹
          </Link>
          <Link
            href={link(view, todayKey)}
            className="inline-flex h-8 items-center justify-center rounded-md border bg-background px-3 hover:bg-accent"
          >
            Vandaag
          </Link>
          <Link
            href={link(view, step(1))}
            aria-label="Volgende"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background hover:bg-accent"
          >
            ›
          </Link>
        </div>
      </div>

      <h2 className="mt-4 text-lg font-semibold capitalize">{title}</h2>

      <div className="mt-4">
        {view === "maand" ? (
          <MonthView
            anchor={anchor}
            byDay={byDay}
            waitlistByDay={waitlistByDay}
            timeOff={timeOff}
            todayKey={todayKey}
          />
        ) : (
          <AgendaTimeGrid
            days={gridDays}
            byDay={byDay}
            waitlistByDay={waitlistByDay}
            todayKey={todayKey}
            timeOff={timeOff}
            openingHours={openingBlocks}
            specialOpenings={specialOpenings}
            serviceColors={serviceColors}
          />
        )}
      </div>
    </div>
  );
}

function BookingChip({ b }: { b: BookingListItem }) {
  return (
    <Link
      href={`/boekingen/${b.id}`}
      title={`${formatTime(new Date(b.starts_at))} ${b.service?.name ?? ""} — ${b.customer?.full_name ?? ""}`}
      className="flex items-center gap-1.5 truncate rounded px-1 py-0.5 text-[11px] leading-tight hover:bg-accent"
    >
      <span
        className={
          "h-1.5 w-1.5 shrink-0 rounded-full " +
          (DOT[b.status] ?? "bg-muted-foreground")
        }
        aria-hidden
      />
      <span className="font-mono">{formatTime(new Date(b.starts_at))}</span>
      <span className="truncate">
        {b.service?.name ?? b.customer?.full_name ?? "—"}
      </span>
    </Link>
  );
}

function MonthView({
  anchor,
  byDay,
  waitlistByDay,
  timeOff,
  todayKey,
}: {
  anchor: Date;
  byDay: Map<string, BookingListItem[]>;
  waitlistByDay: Map<string, string[]>;
  timeOff: TimeOffRow[];
  todayKey: string;
}) {
  const gridStart = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const currentMonth = format(anchor, "yyyy-MM");

  return (
    <div className="overflow-x-auto rounded-lg border">
      <div className="min-w-[700px]">
        <div className="grid grid-cols-7 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-center uppercase">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const inMonth = format(day, "yyyy-MM") === currentMonth;
            const isToday = key === todayKey;
            const items = byDay.get(key) ?? [];
            const shown = items.slice(0, 3);
            const extra = items.length - shown.length;
            const waiting = waitlistByDay.get(key) ?? [];
            const off = timeOffSegmentsForDay(key, timeOff);
            return (
              <div
                key={key}
                className={
                  "min-h-[104px] border-b border-r p-1.5 last:border-r-0 [&:nth-child(7n)]:border-r-0 " +
                  (inMonth ? "" : "bg-muted/20 text-muted-foreground")
                }
              >
                <div className="flex items-center justify-between">
                  <Link
                    href={`/agenda?view=dag&date=${key}`}
                    className={
                      "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs hover:bg-accent " +
                      (isToday
                        ? "bg-foreground font-semibold text-background"
                        : "")
                    }
                  >
                    {format(day, "d")}
                  </Link>
                  <Link
                    href={`/boekingen/nieuw?date=${key}`}
                    aria-label={`Nieuwe boeking op ${key}`}
                    title="Nieuwe boeking"
                    className="inline-flex h-5 w-5 items-center justify-center rounded text-sm leading-none text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    +
                  </Link>
                </div>
                <div className="mt-1 flex flex-col gap-0.5">
                  {off.length > 0 && (
                    <Link
                      href="/instellingen/vrije-dagen"
                      title={off
                        .map((s) => s.reason || "Afwezig")
                        .join(", ")}
                      className="truncate rounded bg-stone-200 px-1 text-[10px] font-medium text-stone-700 hover:bg-stone-300"
                    >
                      Afwezig
                    </Link>
                  )}
                  {shown.map((b) => (
                    <BookingChip key={b.id} b={b} />
                  ))}
                  {extra > 0 && (
                    <Link
                      href={`/agenda?view=dag&date=${key}`}
                      className="px-1 text-[11px] text-muted-foreground hover:underline"
                    >
                      +{extra} meer
                    </Link>
                  )}
                  {waiting.length > 0 && (
                    <Link
                      href="/instellingen/wachtlijst"
                      title={`Wachtlijst (${waiting.length}): ${waiting.join(", ")}`}
                      className="truncate rounded bg-amber-100 px-1 text-[10px] text-amber-900 hover:bg-amber-200"
                    >
                      Wachtlijst {waiting.length}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
