import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { listSpecialOpenings } from "@/lib/db/admin-schedule";
import {
  TZ,
  startOfDayInTz,
  endOfDayInTz,
  weekdayInTz,
  zonedDateTimeToUtc,
} from "@/lib/time";

export type Interval = { startsAt: Date; endsAt: Date };

export type ComputeSlotsInput = {
  /** YYYY-MM-DD in `Europe/Amsterdam`. */
  date: string;
  /** Recurring opening blocks for this weekday, "HH:MM" 24h. */
  openingBlocks: Array<{ start: string; end: string }>;
  /** Already-occupied UTC intervals (bookings + time-off; bookings already include buffer). */
  occupied: Interval[];
  /** Service duration in minutes. */
  durationMin: number;
  /** Step granularity, default 15 min. */
  stepMin?: number;
  /** Earliest a customer may book from now, default 2h. */
  minLeadMin?: number;
  /** Reference time for lead-time enforcement. Defaults to `new Date()`. */
  now?: Date;
};

const MS_PER_MIN = 60_000;

/**
 * Pure slot-computation. No DB. Easy to unit-test.
 */
export function computeAvailableSlots(input: ComputeSlotsInput): Interval[] {
  const {
    date,
    openingBlocks,
    occupied,
    durationMin,
    stepMin = 15,
    minLeadMin = 120,
    now = new Date(),
  } = input;

  const earliestStart = new Date(now.getTime() + minLeadMin * MS_PER_MIN);
  const slots: Interval[] = [];

  for (const block of openingBlocks) {
    const blockStart = zonedDateTimeToUtc(date, block.start);
    const blockEnd = zonedDateTimeToUtc(date, block.end);
    const stepMs = stepMin * MS_PER_MIN;
    const durMs = durationMin * MS_PER_MIN;

    for (
      let cursor = blockStart.getTime();
      cursor + durMs <= blockEnd.getTime();
      cursor += stepMs
    ) {
      const startsAt = new Date(cursor);
      const endsAt = new Date(cursor + durMs);

      if (startsAt < earliestStart) continue;

      const overlap = occupied.some((o) => intervalsOverlap(startsAt, endsAt, o.startsAt, o.endsAt));
      if (overlap) continue;

      slots.push({ startsAt, endsAt });
    }
  }

  return slots;
}

export type SlotStatus = { startsAt: Date; endsAt: Date; available: boolean };

/**
 * Like {@link computeAvailableSlots} but keeps the occupied candidates
 * too, tagged `available: false`, so the UI can show a fully-booked day
 * and offer the waitlist. Past / within-lead-time candidates are still
 * dropped (they aren't "booked", just not offerable). The available
 * subset is identical to {@link computeAvailableSlots}.
 */
export function computeSlotStatuses(input: ComputeSlotsInput): SlotStatus[] {
  const {
    date,
    openingBlocks,
    occupied,
    durationMin,
    stepMin = 15,
    minLeadMin = 120,
    now = new Date(),
  } = input;

  const earliestStart = new Date(now.getTime() + minLeadMin * MS_PER_MIN);
  const out: SlotStatus[] = [];

  for (const block of openingBlocks) {
    const blockStart = zonedDateTimeToUtc(date, block.start);
    const blockEnd = zonedDateTimeToUtc(date, block.end);
    const stepMs = stepMin * MS_PER_MIN;
    const durMs = durationMin * MS_PER_MIN;

    for (
      let cursor = blockStart.getTime();
      cursor + durMs <= blockEnd.getTime();
      cursor += stepMs
    ) {
      const startsAt = new Date(cursor);
      const endsAt = new Date(cursor + durMs);

      if (startsAt < earliestStart) continue;

      const overlap = occupied.some((o) =>
        intervalsOverlap(startsAt, endsAt, o.startsAt, o.endsAt),
      );
      out.push({ startsAt, endsAt, available: !overlap });
    }
  }

  return out;
}

function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Apply a buffer (in minutes) at both ends of an interval. */
export function inflate(interval: Interval, bufferMin: number): Interval {
  const ms = bufferMin * MS_PER_MIN;
  return {
    startsAt: new Date(interval.startsAt.getTime() - ms),
    endsAt: new Date(interval.endsAt.getTime() + ms),
  };
}

// ---------------- DB-fronted ----------------

export type GetSlotsArgs = {
  staffId: string;
  serviceId: string;
  /** YYYY-MM-DD in `Europe/Amsterdam`. */
  date: string;
};

export type AvailabilityDiagnostics = {
  staffId: string;
  serviceId: string;
  date: string;
  weekday: number;
  service: {
    duration_min: number;
    buffer_min: number;
    is_online_bookable: boolean;
    kind: string;
    is_active: boolean;
  } | null;
  earlyExit: string | null;
  openingBlocks: Array<{ start: string; end: string }>;
  bookings: Array<{ starts_at: string; ends_at: string }>;
  timeOff: Array<{ starts_at: string; ends_at: string }>;
  slotCount: number;
};

export async function getAvailableSlotsWithDiagnostics(
  args: GetSlotsArgs,
): Promise<{
  slots: Interval[];
  statuses: SlotStatus[];
  diag: AvailabilityDiagnostics;
}> {
  const supabase = createSupabaseServiceClient();
  const { staffId, serviceId, date } = args;

  const diag: AvailabilityDiagnostics = {
    staffId,
    serviceId,
    date,
    weekday: -1,
    service: null,
    earlyExit: null,
    openingBlocks: [],
    bookings: [],
    timeOff: [],
    slotCount: 0,
  };

  const { data: service, error: svcErr } = await supabase
    .from("services")
    .select("duration_min, buffer_min, is_online_bookable, kind, is_active")
    .eq("id", serviceId)
    .single();
  if (svcErr || !service) {
    diag.earlyExit = "service_not_found";
    return { slots: [], statuses: [], diag };
  }
  diag.service = service;
  if (!service.is_active || !service.is_online_bookable) {
    diag.earlyExit = "service_inactive_or_not_bookable";
    return { slots: [], statuses: [], diag };
  }

  const dayStart = startOfDayInTz(date);
  const dayEnd = endOfDayInTz(date);

  const windowStart = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000);
  const windowEnd = new Date(dayEnd.getTime() + 24 * 60 * 60 * 1000);

  const weekday = weekdayInTz(dayStart);
  diag.weekday = weekday;

  const [
    { data: hours, error: hoursErr },
    { data: timeOff, error: toErr },
    { data: bookings, error: bookErr },
    specialOpenings,
  ] = await Promise.all([
    supabase
      .from("opening_hours")
      .select("start_time, end_time")
      .eq("staff_id", staffId)
      .eq("weekday", weekday),
    supabase
      .from("time_off")
      .select("starts_at, ends_at")
      .eq("staff_id", staffId)
      .lt("starts_at", windowEnd.toISOString())
      .gt("ends_at", windowStart.toISOString()),
    supabase
      .from("bookings")
      .select("starts_at, ends_at")
      .eq("staff_id", staffId)
      .in("status", ["pending", "confirmed"])
      .lt("starts_at", windowEnd.toISOString())
      .gt("ends_at", windowStart.toISOString()),
    listSpecialOpenings(),
  ]);

  if (hoursErr) throw hoursErr;
  if (toErr) throw toErr;
  if (bookErr) throw bookErr;

  // A one-off opening for this date replaces the recurring weekday hours.
  const todaySpecials = specialOpenings.filter((s) => s.date === date);
  const openingBlocks =
    todaySpecials.length > 0
      ? todaySpecials.map((s) => ({ start: s.start, end: s.end }))
      : (hours ?? []).map((h: { start_time: string; end_time: string }) => ({
          start: h.start_time.slice(0, 5),
          end: h.end_time.slice(0, 5),
        }));
  diag.openingBlocks = openingBlocks;
  diag.bookings = bookings ?? [];
  diag.timeOff = timeOff ?? [];

  const bookingIntervals: Interval[] = (bookings ?? []).map(
    (b: { starts_at: string; ends_at: string }) => ({
      startsAt: new Date(b.starts_at),
      endsAt: new Date(b.ends_at),
    }),
  );
  const inflated = bookingIntervals.map((i) => inflate(i, service.buffer_min ?? 0));

  const timeOffIntervals: Interval[] = (timeOff ?? []).map(
    (t: { starts_at: string; ends_at: string }) => ({
      startsAt: new Date(t.starts_at),
      endsAt: new Date(t.ends_at),
    }),
  );

  const computeInput = {
    date,
    openingBlocks,
    occupied: [...inflated, ...timeOffIntervals],
    durationMin: service.duration_min,
    stepMin: 30,
  };
  const slots = computeAvailableSlots(computeInput);
  const statuses = computeSlotStatuses(computeInput);
  diag.slotCount = slots.length;

  if (slots.length === 0) {
    console.warn("[availability] zero slots", JSON.stringify(diag));
  }

  return { slots, statuses, diag };
}

export async function getAvailableSlots(args: GetSlotsArgs): Promise<Interval[]> {
  const { slots } = await getAvailableSlotsWithDiagnostics(args);
  return slots;
}

export async function getDaySlotStatuses(
  args: GetSlotsArgs,
): Promise<SlotStatus[]> {
  const { statuses } = await getAvailableSlotsWithDiagnostics(args);
  return statuses;
}

export { TZ };
