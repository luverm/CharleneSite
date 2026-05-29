import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type BookingRow = {
  id: string;
  staff_id: string;
  service_id: string;
  customer_id: string;
  starts_at: string;
  ends_at: string;
  status: "pending" | "confirmed" | "cancelled" | "no_show" | "completed";
  notes: string | null;
  idempotency_key: string | null;
  paid: boolean | null;
  paid_method: string | null;
  paid_amount_cents: number | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BookingInsert = {
  staffId: string;
  serviceId: string;
  customerId: string;
  startsAt: string;
  endsAt: string;
  notes?: string;
  idempotencyKey: string;
};

export type BookingDetail = BookingRow & {
  service: { name: string; duration_min: number; price_cents: number };
  customer: { full_name: string; email: string; phone: string | null };
};

/**
 * Postgres exclusion-violation = the booking would have overlapped an
 * existing pending/confirmed booking. Surfaces as `23P01` from supabase-js.
 */
export function isExclusionViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: unknown }).code;
  return code === "23P01" || code === "EXCLUSION_VIOLATION";
}

export async function findBookingByIdempotencyKey(
  key: string,
): Promise<BookingRow | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("idempotency_key", key)
    .maybeSingle();
  if (error) throw error;
  return (data as BookingRow | null) ?? null;
}

export async function insertBooking(input: BookingInsert): Promise<BookingRow> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      staff_id: input.staffId,
      service_id: input.serviceId,
      customer_id: input.customerId,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      status: "confirmed",
      notes: input.notes ?? null,
      idempotency_key: input.idempotencyKey,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Failed to insert booking");
  return data as BookingRow;
}

export async function getBookingDetail(id: string): Promise<BookingDetail | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      service:services(name, duration_min, price_cents),
      customer:customers(full_name, email, phone)
      `,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as BookingDetail | null) ?? null;
}

export async function cancelBooking(id: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) throw error;
}

/** Hard-deletes every booking. Irreversible. Returns the count removed. */
export async function deleteAllBookings(): Promise<number> {
  const supabase = createSupabaseServiceClient();
  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true });
  // id is the PK (never null), so this matches all rows while still
  // satisfying PostgREST's "delete needs a filter" requirement.
  const { error } = await supabase
    .from("bookings")
    .delete()
    .not("id", "is", null);
  if (error) throw error;
  return count ?? 0;
}

/** Hard-deletes a single booking. Irreversible. */
export async function deleteBooking(id: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) throw error;
}

/** Hard-deletes the given bookings. Irreversible. Returns the count removed. */
export async function deleteBookings(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const supabase = createSupabaseServiceClient();
  const { error, count } = await supabase
    .from("bookings")
    .delete({ count: "exact" })
    .in("id", ids);
  if (error) throw error;
  return count ?? 0;
}

export async function writeAuditLog(input: {
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  payload?: unknown;
}): Promise<void> {
  const supabase = createSupabaseServiceClient();
  await supabase.from("audit_log").insert({
    actor: input.actor,
    action: input.action,
    entity: input.entity,
    entity_id: input.entityId,
    payload: input.payload ?? null,
  });
}
