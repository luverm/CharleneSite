import type { BookingRow } from "@/lib/db/bookings";

export type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

type BookingStatus = BookingRow["status"];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "In afwachting",
  confirmed: "Bevestigd",
  cancelled: "Geannuleerd",
  no_show: "No-show",
  completed: "Afgerond",
};

export const BOOKING_STATUS_VARIANTS: Record<BookingStatus, BadgeVariant> = {
  pending: "secondary",
  confirmed: "default",
  cancelled: "destructive",
  no_show: "destructive",
  completed: "outline",
};

export function bookingStatusLabel(status: string): string {
  return BOOKING_STATUS_LABELS[status as BookingStatus] ?? status;
}

export function bookingStatusVariant(status: string): BadgeVariant {
  return BOOKING_STATUS_VARIANTS[status as BookingStatus] ?? "outline";
}
