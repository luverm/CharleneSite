import type { BookingListItem } from "@/lib/db/admin-bookings";
import type { TimeOffRow } from "@/lib/db/admin-schedule";
import { formatIsoDate, formatTime } from "@/lib/time";

/** Groups bookings by their start day (Europe/Amsterdam), skipping cancelled. */
export function groupByDay(
  bookings: BookingListItem[],
): Map<string, BookingListItem[]> {
  const byDay = new Map<string, BookingListItem[]>();
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    const key = formatIsoDate(new Date(b.starts_at));
    const arr = byDay.get(key);
    if (arr) arr.push(b);
    else byDay.set(key, [b]);
  }
  for (const arr of byDay.values()) {
    arr.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }
  return byDay;
}

/** Wall-clock minutes from midnight (Europe/Amsterdam) for an ISO timestamp. */
export function minutesOfDay(iso: string): number {
  const [h, m] = formatTime(new Date(iso)).split(":").map(Number);
  return h * 60 + m;
}

/** The part of each time-off block that falls on a given day, in minutes. */
export function timeOffSegmentsForDay(
  dayKey: string,
  timeOff: TimeOffRow[],
): Array<{ id: string; startMin: number; endMin: number; reason: string }> {
  const out: Array<{
    id: string;
    startMin: number;
    endMin: number;
    reason: string;
  }> = [];
  for (const t of timeOff) {
    const startKey = formatIsoDate(new Date(t.starts_at));
    const endKey = formatIsoDate(new Date(t.ends_at));
    if (dayKey < startKey || dayKey > endKey) continue;
    const startMin = dayKey === startKey ? minutesOfDay(t.starts_at) : 0;
    const endMin = dayKey === endKey ? minutesOfDay(t.ends_at) : 24 * 60;
    if (endMin <= startMin) continue;
    out.push({ id: t.id, startMin, endMin, reason: t.reason?.trim() || "" });
  }
  return out;
}
