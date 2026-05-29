import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type CustomerListItem = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  bookings_count: number;
};

export type CustomerOption = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
};

/**
 * Hard-deletes customers, skipping any that still have bookings — those
 * carry history and an FK, and must have their bookings removed first.
 * Returns the count actually removed.
 */
export async function deleteCustomers(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const svc = createSupabaseServiceClient();
  const { data: booked } = await svc
    .from("bookings")
    .select("customer_id")
    .in("customer_id", ids);
  const blocked = new Set(
    (booked ?? []).map((b) => (b as { customer_id: string }).customer_id),
  );
  const deletable = ids.filter((id) => !blocked.has(id));
  if (deletable.length === 0) return 0;
  const { error, count } = await svc
    .from("customers")
    .delete({ count: "exact" })
    .in("id", deletable);
  if (error) throw error;
  return count ?? 0;
}

/** Lightweight name/email search for the booking-form customer picker. */
export async function searchCustomers(
  q: string,
): Promise<CustomerOption[]> {
  // Strip characters that have meaning in a PostgREST or() filter.
  const term = q.trim().replace(/[,()*%]/g, " ").trim();
  if (term.length < 2) return [];
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, full_name, email, phone")
    .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
    .order("full_name", { ascending: true })
    .limit(8);
  if (error) throw error;
  return (data ?? []) as CustomerOption[];
}

export type CustomerBooking = {
  id: string;
  starts_at: string;
  status: string;
  service: { name: string; price_cents: number } | null;
};

export type CustomerDetail = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
  bookings: CustomerBooking[];
  totalBookings: number;
  noShowCount: number;
  spentCents: number;
};

export async function getCustomerDetail(
  id: string,
): Promise<CustomerDetail | null> {
  const supabase = createSupabaseServiceClient();
  const { data: c, error: cErr } = await supabase
    .from("customers")
    .select("id, email, full_name, phone, notes, created_at")
    .eq("id", id)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!c) return null;

  const { data: b, error: bErr } = await supabase
    .from("bookings")
    .select("id, starts_at, status, service:services(name, price_cents)")
    .eq("customer_id", id)
    .order("starts_at", { ascending: false });
  if (bErr) throw bErr;

  const bookings = (b ?? []) as unknown as CustomerBooking[];
  const noShowCount = bookings.filter((x) => x.status === "no_show").length;
  const spentCents = bookings
    .filter((x) => x.status === "completed")
    .reduce((acc, x) => acc + (x.service?.price_cents ?? 0), 0);

  return {
    ...(c as {
      id: string;
      email: string;
      full_name: string;
      phone: string | null;
      notes: string | null;
      created_at: string;
    }),
    bookings,
    totalBookings: bookings.length,
    noShowCount,
    spentCents,
  };
}

export async function updateCustomerNotes(
  id: string,
  notes: string,
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("customers")
    .update({ notes: notes || null })
    .eq("id", id);
  if (error) throw error;
}

export async function listCustomers(q?: string): Promise<CustomerListItem[]> {
  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from("customers")
    .select(
      `
      id,
      email,
      full_name,
      phone,
      created_at,
      bookings(count)
      `,
    )
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as Array<{
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
    created_at: string;
    bookings: { count: number }[];
  }>).map((row) => ({
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    phone: row.phone,
    created_at: row.created_at,
    bookings_count: row.bookings[0]?.count ?? 0,
  }));
}
