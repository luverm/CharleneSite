import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { formatIsoDate, formatTime } from "@/lib/time";

type RealisedRow = {
  id: string;
  starts_at: string;
  status: string;
  service: { name: string; price_cents: number } | null;
  customer: { full_name: string; email: string } | null;
  paid: boolean | null;
  paid_method: string | null;
  paid_at: string | null;
};

function splitVat(inclCents: number, vatRate: number) {
  if (vatRate <= 0) return { excl: inclCents, vat: 0 };
  const excl = Math.round(inclCents / (1 + vatRate / 100));
  return { excl, vat: inclCents - excl };
}

async function fetchRealised(
  fromIso: string,
  toIso: string,
): Promise<RealisedRow[]> {
  const svc = createSupabaseServiceClient();
  const nowIso = new Date().toISOString();
  // Realised revenue: completed, or a past confirmed appointment.
  const { data, error } = await svc
    .from("bookings")
    .select(
      `id, starts_at, status, paid, paid_method, paid_at,
       service:services(name, price_cents),
       customer:customers(full_name, email)`,
    )
    .gte("starts_at", fromIso)
    .lte("starts_at", toIso)
    .in("status", ["completed", "confirmed"])
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as RealisedRow[]).filter(
    (r) => r.status === "completed" || r.starts_at < nowIso,
  );
}

export type PeriodTotals = {
  label: string;
  inclCents: number;
  exclCents: number;
  vatCents: number;
  count: number;
};

export type FinanceSummary = {
  vatRate: number;
  years: Array<{
    year: number;
    quarters: PeriodTotals[];
    total: PeriodTotals;
  }>;
};

/** Per-quarter and per-year realised revenue for the last 2 calendar years. */
export async function loadFinanceSummary(
  vatRate: number,
): Promise<FinanceSummary> {
  const thisYear = Number(formatIsoDate(new Date()).slice(0, 4));
  const fromIso = new Date(Date.UTC(thisYear - 1, 0, 1)).toISOString();
  const toIso = new Date(Date.UTC(thisYear, 11, 31, 23, 59, 59)).toISOString();
  const rows = await fetchRealised(fromIso, toIso);

  const acc = new Map<string, { incl: number; count: number }>();
  for (const r of rows) {
    const localDay = formatIsoDate(new Date(r.starts_at)); // YYYY-MM-DD (NL)
    const year = Number(localDay.slice(0, 4));
    const month = Number(localDay.slice(5, 7));
    const q = Math.floor((month - 1) / 3) + 1;
    const key = `${year}-Q${q}`;
    const cur = acc.get(key) ?? { incl: 0, count: 0 };
    cur.incl += r.service?.price_cents ?? 0;
    cur.count += 1;
    acc.set(key, cur);
  }

  const years = [thisYear - 1, thisYear].map((year) => {
    const quarters: PeriodTotals[] = [1, 2, 3, 4].map((q) => {
      const { incl = 0, count = 0 } = acc.get(`${year}-Q${q}`) ?? {};
      const { excl, vat } = splitVat(incl, vatRate);
      return {
        label: `Q${q}`,
        inclCents: incl,
        exclCents: excl,
        vatCents: vat,
        count,
      };
    });
    const incl = quarters.reduce((s, x) => s + x.inclCents, 0);
    const count = quarters.reduce((s, x) => s + x.count, 0);
    const { excl, vat } = splitVat(incl, vatRate);
    return {
      year,
      quarters,
      total: {
        label: String(year),
        inclCents: incl,
        exclCents: excl,
        vatCents: vat,
        count,
      },
    };
  });

  return { vatRate, years };
}

// With ";" as the separator, only ";", quote and newline need escaping —
// so comma-decimal amounts (12,50) stay unquoted and import as numbers.
function csvCell(v: string | number): string {
  const s = String(v);
  return /["\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function eur(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Bookkeeping CSV for a date range, with BTW split per row. */
export async function buildBookingsCsv(
  fromDate: string,
  toDate: string,
  vatRate: number,
): Promise<string> {
  const rows = await fetchRealised(
    `${fromDate}T00:00:00Z`,
    `${toDate}T23:59:59Z`,
  );

  // Match each booking line to its invoice number (if invoiced).
  const invByBooking = new Map<string, string>();
  if (rows.length > 0) {
    const svc = createSupabaseServiceClient();
    const { data } = await svc
      .from("invoices")
      .select("booking_id, number")
      .in(
        "booking_id",
        rows.map((r) => r.id),
      );
    for (const x of (data ?? []) as Array<{
      booking_id: string | null;
      number: string;
    }>) {
      if (x.booking_id) invByBooking.set(x.booking_id, x.number);
    }
  }

  const header = [
    "Datum",
    "Tijd",
    "Referentie",
    "Dienst",
    "Klant",
    "E-mail",
    "Status",
    "Bedrag excl",
    "BTW %",
    "BTW",
    "Bedrag incl",
    "Betaald",
    "Betaalmethode",
    "Betaaldatum",
    "Factuurnummer",
  ];
  const lines = [header.join(";")];
  for (const r of rows) {
    const incl = r.service?.price_cents ?? 0;
    const { excl, vat } = splitVat(incl, vatRate);
    lines.push(
      [
        formatIsoDate(new Date(r.starts_at)),
        formatTime(new Date(r.starts_at)),
        r.id.slice(0, 8).toUpperCase(),
        r.service?.name ?? "",
        r.customer?.full_name ?? "",
        r.customer?.email ?? "",
        r.status,
        eur(excl),
        String(vatRate),
        eur(vat),
        eur(incl),
        r.paid ? "ja" : "nee",
        r.paid_method ?? "",
        r.paid_at ? formatIsoDate(new Date(r.paid_at)) : "",
        invByBooking.get(r.id) ?? "",
      ]
        .map(csvCell)
        .join(";"),
    );
  }
  // UTF-8 BOM so Excel (NL) shows €/accented names correctly.
  return "\uFEFF" + lines.join("\r\n");
}
