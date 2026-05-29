import "server-only";
import * as ics from "ics";

function toArr(d: Date): [number, number, number, number, number] {
  return [
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
  ];
}

/** Build an iCalendar VEVENT string for a booking, or null on failure. */
export function bookingIcs(args: {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  description?: string;
  location?: string;
}): string | null {
  const { error, value } = ics.createEvent({
    uid: `booking-${args.id}@charlene`,
    title: args.title,
    start: toArr(args.startsAt),
    startInputType: "utc",
    end: toArr(args.endsAt),
    endInputType: "utc",
    description: args.description,
    location: args.location,
    status: "CONFIRMED",
  });
  if (error || !value) return null;
  return value;
}
