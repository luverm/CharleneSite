import { format, parse } from "date-fns";
import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";

export const TZ = "Europe/Amsterdam";

/**
 * Convert a calendar date + clock time in `Europe/Amsterdam` to a UTC Date.
 * `date` is YYYY-MM-DD, `time` is HH:MM (24h).
 */
export function zonedDateTimeToUtc(date: string, time: string): Date {
  const local = parse(`${date} ${time}`, "yyyy-MM-dd HH:mm", new Date());
  return fromZonedTime(local, TZ);
}

/**
 * Weekday for the given UTC date when viewed in `Europe/Amsterdam`.
 * Sunday = 0, Monday = 1, ..., Saturday = 6 (matches DB convention).
 */
export function weekdayInTz(date: Date): number {
  const zoned = toZonedTime(date, TZ);
  return zoned.getDay();
}

/** Format a UTC date for display in `Europe/Amsterdam`. */
export function formatInTz(date: Date, fmt: string): string {
  return formatInTimeZone(date, TZ, fmt);
}

/**
 * Returns midnight UTC for the start of the given calendar day in
 * `Europe/Amsterdam`. Useful for day-bounded queries.
 */
export function startOfDayInTz(date: string): Date {
  return zonedDateTimeToUtc(date, "00:00");
}

export function endOfDayInTz(date: string): Date {
  // 24:00 of `date` == 00:00 of the next day; date-fns parse handles 24:00? No.
  // We add 24h to start-of-day to get exclusive upper bound.
  return new Date(startOfDayInTz(date).getTime() + 24 * 60 * 60 * 1000);
}

export function formatHumanDateTime(date: Date): string {
  return formatInTimeZone(date, TZ, "EEEE d MMMM yyyy 'om' HH:mm");
}

export function formatIsoDate(date: Date): string {
  return formatInTimeZone(date, TZ, "yyyy-MM-dd");
}

export function formatTime(date: Date): string {
  return formatInTimeZone(date, TZ, "HH:mm");
}

export { format };
