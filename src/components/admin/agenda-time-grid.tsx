"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { BookingListItem } from "@/lib/db/admin-bookings";
import type { TimeOffRow } from "@/lib/db/admin-schedule";
import { agendaBlockClass } from "@/lib/agenda-colors";
import { rescheduleBooking } from "@/actions/admin-booking";
import { formatTime, zonedDateTimeToUtc } from "@/lib/time";
import {
  timeOffSegmentsForDay,
  minutesOfDay,
} from "@/lib/agenda-grid-data";

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

const EVENT_STYLE: Record<string, string> = {
  confirmed: "border-l-emerald-500 bg-emerald-50",
  pending: "border-l-amber-500 bg-amber-50",
  completed: "border-l-sky-500 bg-sky-50",
  no_show: "border-l-rose-500 bg-rose-50",
};

const HOUR_PX = 64;
const SLOT_PX = HOUR_PX / 2;
const HATCH =
  "repeating-linear-gradient(45deg, rgba(120,113,108,0.22) 0 8px, transparent 8px 16px)";
const CLOSED_HATCH =
  "repeating-linear-gradient(45deg, rgba(120,113,108,0.09) 0 6px, transparent 6px 12px)";

export type OpeningBlock = { weekday: number; start: string; end: string };
export type SpecialOpeningBlock = {
  date: string;
  start: string;
  end: string;
};

export function AgendaTimeGrid({
  days,
  byDay,
  waitlistByDay,
  todayKey,
  timeOff = [],
  openingHours = [],
  specialOpenings = [],
  serviceColors = {},
}: {
  days: Date[];
  byDay: Map<string, BookingListItem[]>;
  waitlistByDay: Map<string, string[]>;
  todayKey: string;
  timeOff?: TimeOffRow[];
  /** Opening blocks per weekday (0 = Sunday); hours outside are greyed. */
  openingHours?: OpeningBlock[];
  /** One-off openings on specific dates; override the weekday hours. */
  specialOpenings?: SpecialOpeningBlock[];
  /** Service id → agenda colour key; colours appointment blocks. */
  serviceColors?: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const allBookings = Array.from(byDay.values()).flat();

  // A booking dropped on a 30-minute slot is rescheduled to that time,
  // keeping its current length.
  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (!activeId.startsWith("b:") || !overId.startsWith("s:")) return;

    const bookingId = activeId.slice(2);
    const [dateKey, time] = overId.slice(2).split("|");
    const booking = allBookings.find((b) => b.id === bookingId);
    if (!booking || !dateKey || !time) return;

    const start = zonedDateTimeToUtc(dateKey, time);
    if (start.getTime() === new Date(booking.starts_at).getTime()) return;
    const durationMs =
      new Date(booking.ends_at).getTime() -
      new Date(booking.starts_at).getTime();
    const end = new Date(
      start.getTime() + (durationMs > 0 ? durationMs : 30 * 60_000),
    );

    startTransition(async () => {
      const r = await rescheduleBooking({
        id: bookingId,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
      });
      if (r.ok) {
        toast.success("Afspraak verzet — klant is gemaild");
        router.refresh();
      } else if (r.code === "SLOT_TAKEN") {
        toast.error("Dat tijdslot is al bezet.");
      } else {
        toast.error("Verzetten mislukt.");
      }
    });
  }

  const hhmmToMin = (s: string) => {
    const [h, m] = s.split(":").map(Number);
    return h * 60 + m;
  };
  const dayWindows = (day: Date) => {
    const key = format(day, "yyyy-MM-dd");
    const special = specialOpenings.filter((s) => s.date === key);
    const blocks: Array<{ start: string; end: string }> =
      special.length > 0
        ? special
        : openingHours.filter((o) => o.weekday === day.getDay());
    return blocks
      .map((o) => ({ start: hhmmToMin(o.start), end: hhmmToMin(o.end) }))
      .sort((a, b) => a.start - b.start);
  };
  const hasOpeningHours =
    openingHours.length > 0 || specialOpenings.length > 0;
  const isClosed = (day: Date) =>
    hasOpeningHours && dayWindows(day).length === 0;

  let startHour = 8;
  let endHour = 19;
  for (const day of days) {
    for (const b of byDay.get(format(day, "yyyy-MM-dd")) ?? []) {
      startHour = Math.min(startHour, Math.floor(minutesOfDay(b.starts_at) / 60));
      endHour = Math.max(endHour, Math.ceil(minutesOfDay(b.ends_at) / 60));
    }
  }
  const visibleWeekdays = new Set(days.map((d) => d.getDay()));
  for (const o of openingHours) {
    if (!visibleWeekdays.has(o.weekday)) continue;
    startHour = Math.min(startHour, Math.floor(hhmmToMin(o.start) / 60));
    endHour = Math.max(endHour, Math.ceil(hhmmToMin(o.end) / 60));
  }
  const visibleDates = new Set(days.map((d) => format(d, "yyyy-MM-dd")));
  for (const s of specialOpenings) {
    if (!visibleDates.has(s.date)) continue;
    startHour = Math.min(startHour, Math.floor(hhmmToMin(s.start) / 60));
    endHour = Math.max(endHour, Math.ceil(hhmmToMin(s.end) / 60));
  }
  startHour = Math.max(5, startHour);
  endHour = Math.min(23, endHour);

  const hours: number[] = [];
  for (let h = startHour; h <= endHour; h++) hours.push(h);
  const gridHeight = (endHour - startHour) * HOUR_PX;
  const gridStartMin = startHour * 60;
  const gridEndMin = endHour * 60;
  const perMin = HOUR_PX / 60;
  const single = days.length === 1;
  const colClass = single ? "flex-1" : "w-44 shrink-0";

  const closedIntervals = (day: Date): Array<{ from: number; to: number }> => {
    const windows = dayWindows(day);
    if (windows.length === 0) return [];
    const out: Array<{ from: number; to: number }> = [];
    let cursor = gridStartMin;
    for (const w of windows) {
      if (w.start > cursor) out.push({ from: cursor, to: w.start });
      cursor = Math.max(cursor, w.end);
    }
    if (cursor < gridEndMin) out.push({ from: cursor, to: gridEndMin });
    return out.filter((iv) => iv.to > iv.from);
  };

  const allDay = days.map((day) => {
    const segs = timeOffSegmentsForDay(format(day, "yyyy-MM-dd"), timeOff);
    return { off: segs.length > 0, reason: segs[0]?.reason ?? "" };
  });
  const hasAbsence = allDay.some((d) => d.off);

  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">
        Tik op een vrij tijdvak voor een nieuwe afspraak. Sleep een
        afspraak naar een ander tijdstip om hem te verzetten.
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragEnd={onDragEnd}
      >
        <div
          className={
            "overflow-x-auto rounded-lg border " +
            (pending ? "pointer-events-none opacity-60" : "")
          }
        >
          <div className="w-max min-w-full">
            <div className="flex border-b bg-muted/30">
              <div className="sticky left-0 z-20 w-14 shrink-0 border-r bg-background" />
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const isToday = key === todayKey;
                const waiting = waitlistByDay.get(key) ?? [];
                return (
                  <div
                    key={key}
                    className={
                      colClass +
                      " border-l px-2 py-2 " +
                      (isClosed(day)
                        ? "bg-muted/50 text-muted-foreground"
                        : "")
                    }
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-medium capitalize">
                        {single
                          ? WEEKDAYS_LONG[Number(format(day, "i")) - 1]
                          : WEEKDAYS[Number(format(day, "i")) - 1]}{" "}
                        <span
                          className={
                            isToday
                              ? "rounded bg-foreground px-1 text-background"
                              : ""
                          }
                        >
                          {format(day, "d")}
                        </span>
                      </span>
                      <Link
                        href={`/boekingen/nieuw?date=${key}`}
                        aria-label={`Nieuwe boeking op ${key}`}
                        title="Nieuwe boeking"
                        className="inline-flex h-5 w-5 items-center justify-center rounded text-sm leading-none text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        +
                      </Link>
                    </div>
                    {waiting.length > 0 && (
                      <Link
                        href="/instellingen/wachtlijst"
                        className="mt-1 block rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-900 hover:bg-amber-200"
                      >
                        Wachtlijst ({waiting.length}): {waiting.join(", ")}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>

            {hasAbsence && (
              <div className="flex border-b bg-muted/20">
                <div className="sticky left-0 z-20 flex w-14 shrink-0 items-center justify-end border-r bg-background pr-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  vrij
                </div>
                {days.map((day, i) => {
                  const key = format(day, "yyyy-MM-dd");
                  const info = allDay[i];
                  const runStart = info.off && (i === 0 || !allDay[i - 1].off);
                  return (
                    <div key={key} className={colClass + " border-l p-1"}>
                      {info.off && (
                        <Link
                          href="/instellingen/vrije-dagen"
                          title={info.reason || "Afwezig"}
                          style={{ backgroundImage: HATCH }}
                          className="block truncate rounded border border-stone-300 bg-stone-100 px-2 py-1 text-xs font-medium text-stone-600"
                        >
                          {runStart ? info.reason || "Afwezig" : " "}
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex">
              <div className="sticky left-0 z-20 w-14 shrink-0 border-r bg-background">
                {hours.map((h) => (
                  <div
                    key={h}
                    style={{ height: HOUR_PX }}
                    className="relative border-b"
                  >
                    <span className="absolute -top-2 right-1.5 text-[11px] text-muted-foreground">
                      {String(h).padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
              </div>

              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const items = byDay.get(key) ?? [];
                return (
                  <div
                    key={key}
                    className={colClass + " relative border-l"}
                    style={{
                      height: gridHeight,
                      ...(isClosed(day)
                        ? { backgroundImage: CLOSED_HATCH }
                        : {}),
                    }}
                  >
                    {!isClosed(day) &&
                      closedIntervals(day).map((iv, idx) => (
                        <div
                          key={`closed-${idx}`}
                          aria-hidden
                          style={{
                            top: (iv.from - gridStartMin) * perMin,
                            height: (iv.to - iv.from) * perMin,
                            backgroundImage: CLOSED_HATCH,
                          }}
                          className="pointer-events-none absolute inset-x-0 bg-muted/20"
                        />
                      ))}

                    {Array.from({
                      length: (endHour - startHour) * 2,
                    }).map((_, i) => {
                      const totalMin = startHour * 60 + i * 30;
                      const hh = String(Math.floor(totalMin / 60)).padStart(
                        2,
                        "0",
                      );
                      const mm = totalMin % 60 === 0 ? "00" : "30";
                      return (
                        <DroppableSlot
                          key={i}
                          id={`s:${key}|${hh}:${mm}`}
                          href={`/boekingen/nieuw?date=${key}&tijd=${hh}:${mm}`}
                          top={i * SLOT_PX}
                          height={SLOT_PX}
                          label={`${hh}:${mm}`}
                          hourLine={mm === "00"}
                        />
                      );
                    })}

                    {items.map((b) => {
                      const startMin = minutesOfDay(b.starts_at);
                      let endMin = minutesOfDay(b.ends_at);
                      if (endMin <= startMin) endMin = startMin + 30;
                      const top = (startMin - gridStartMin) * perMin;
                      const minHeight = Math.max(
                        48,
                        (endMin - startMin) * perMin,
                      );
                      const blockClass =
                        b.status === "no_show"
                          ? EVENT_STYLE.no_show
                          : (agendaBlockClass(serviceColors[b.service_id]) ??
                            EVENT_STYLE[b.status] ??
                            "border-l-stone-400 bg-stone-50");
                      return (
                        <DraggableBooking
                          key={b.id}
                          booking={b}
                          top={top}
                          minHeight={minHeight}
                          blockClass={blockClass}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DndContext>
    </div>
  );
}

function DroppableSlot({
  id,
  href,
  top,
  height,
  label,
  hourLine,
}: {
  id: string;
  href: string;
  top: number;
  height: number;
  label: string;
  hourLine: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <Link
      ref={setNodeRef}
      href={href}
      aria-label={`Nieuwe afspraak om ${label}`}
      style={{ top, height }}
      className={
        "group absolute inset-x-0 flex items-center justify-center border-b transition " +
        (isOver ? "bg-primary/20" : "hover:bg-accent/60") +
        (hourLine ? " border-border/70" : " border-border/35")
      }
    >
      <span className="text-[10px] font-medium text-primary opacity-0 transition group-hover:opacity-100">
        + afspraak {label}
      </span>
    </Link>
  );
}

function DraggableBooking({
  booking,
  top,
  minHeight,
  blockClass,
}: {
  booking: BookingListItem;
  top: number;
  minHeight: number;
  blockClass: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: `b:${booking.id}` });

  const style: React.CSSProperties = {
    top,
    minHeight,
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    zIndex: isDragging ? 30 : undefined,
    opacity: isDragging ? 0.85 : undefined,
  };

  return (
    <Link
      ref={setNodeRef}
      href={`/boekingen/${booking.id}`}
      style={style}
      {...listeners}
      {...attributes}
      className={
        "absolute inset-x-1 z-[1] touch-none cursor-grab rounded-md border border-l-4 px-2 py-1 text-xs leading-tight shadow-sm transition hover:z-10 hover:shadow active:cursor-grabbing " +
        blockClass
      }
    >
      <p className="font-medium text-foreground">
        {formatTime(new Date(booking.starts_at))} –{" "}
        {formatTime(new Date(booking.ends_at))}
      </p>
      <p className="font-medium break-words">
        {booking.customer?.full_name ?? "—"}
      </p>
      <p className="break-words text-muted-foreground">
        {booking.service?.name ?? ""}
      </p>
    </Link>
  );
}
