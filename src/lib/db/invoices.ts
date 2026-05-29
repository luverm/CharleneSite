import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type InvoiceRow = {
  id: string;
  number: string;
  booking_id: string | null;
  customer_name: string;
  customer_email: string | null;
  issued_on: string;
  description: string;
  subtotal_cents: number;
  vat_rate: number;
  vat_cents: number;
  total_cents: number;
  deposit_cents: number;
  created_at: string;
};

export async function getInvoiceByBooking(
  bookingId: string,
): Promise<InvoiceRow | null> {
  const svc = createSupabaseServiceClient();
  const { data, error } = await svc
    .from("invoices")
    .select("*")
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (error) throw error;
  return (data as InvoiceRow | null) ?? null;
}

export type InvoiceLine = {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_cents: number;
  amount_cents: number;
  sort: number;
};

function splitVat(inclCents: number, vatRate: number) {
  if (vatRate <= 0) return { subtotal: inclCents, vat: 0 };
  const subtotal = Math.round(inclCents / (1 + vatRate / 100));
  return { subtotal, vat: inclCents - subtotal };
}

/** Next sequential invoice number for the current year: {prefix}{YYYY}-{NNN}. */
async function nextInvoiceNumber(
  svc: ReturnType<typeof createSupabaseServiceClient>,
  prefix: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await svc
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .gte("issued_on", `${year}-01-01`)
    .lte("issued_on", `${year}-12-31`);
  const seq = (count ?? 0) + 1;
  return `${prefix}${year}-${String(seq).padStart(3, "0")}`;
}

/**
 * Returns the existing invoice for a booking, or creates one with the
 * next sequential number ({prefix}{YYYY}-{NNN}).
 */
export async function ensureInvoiceForBooking(args: {
  bookingId: string;
  customerName: string;
  customerEmail: string | null;
  description: string;
  inclCents: number;
  vatRate: number;
  prefix: string;
}): Promise<InvoiceRow> {
  const svc = createSupabaseServiceClient();

  const existing = await getInvoiceByBooking(args.bookingId);
  if (existing) return existing;

  const number = await nextInvoiceNumber(svc, args.prefix);

  const { subtotal, vat } = splitVat(args.inclCents, args.vatRate);
  const { data, error } = await svc
    .from("invoices")
    .insert({
      number,
      booking_id: args.bookingId,
      customer_name: args.customerName,
      customer_email: args.customerEmail,
      description: args.description,
      subtotal_cents: subtotal,
      vat_rate: args.vatRate,
      vat_cents: vat,
      total_cents: args.inclCents,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Failed to create invoice");
  return data as InvoiceRow;
}

export async function getInvoiceWithLines(
  invoiceId: string,
): Promise<{ invoice: InvoiceRow; lines: InvoiceLine[] } | null> {
  const svc = createSupabaseServiceClient();
  const { data: inv } = await svc
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!inv) return null;
  const { data: lines } = await svc
    .from("invoice_lines")
    .select("id, invoice_id, description, quantity, unit_cents, amount_cents, sort")
    .eq("invoice_id", invoiceId)
    .order("sort", { ascending: true });
  return {
    invoice: inv as InvoiceRow,
    lines: (lines ?? []) as InvoiceLine[],
  };
}

export type InvoiceListItem = {
  id: string;
  number: string;
  issued_on: string;
  customer_name: string;
  total_cents: number;
  booking_id: string | null;
};

/** Most recent invoices, newest first — for the dashboard overview. */
export async function listInvoices(limit = 200): Promise<InvoiceListItem[]> {
  const svc = createSupabaseServiceClient();
  const { data, error } = await svc
    .from("invoices")
    .select("id, number, issued_on, customer_name, total_cents, booking_id")
    .order("issued_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as InvoiceListItem[];
}

/**
 * Hard-deletes EVERY invoice. The on-delete-cascade on invoice_lines
 * cleans up the line items automatically. Irreversible.
 */
export async function deleteAllInvoices(): Promise<number> {
  const svc = createSupabaseServiceClient();
  const { count } = await svc
    .from("invoices")
    .select("id", { count: "exact", head: true });
  const { error } = await svc
    .from("invoices")
    .delete()
    .not("id", "is", null);
  if (error) throw error;
  return count ?? 0;
}

/** Hard-deletes the given invoices. Returns the count removed. */
export async function deleteInvoices(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const svc = createSupabaseServiceClient();
  const { error, count } = await svc
    .from("invoices")
    .delete({ count: "exact" })
    .in("id", ids);
  if (error) throw error;
  return count ?? 0;
}
