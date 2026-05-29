import { BackLink } from "@/components/admin/back-link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBookingDetail } from "@/lib/db/bookings";
import { getBusiness } from "@/lib/db/business-settings";
import { ensureInvoiceForBooking } from "@/lib/db/invoices";
import { InvoiceActions } from "@/components/admin/invoice-actions";
import { formatPrice } from "@/lib/db/services";
import { formatIsoDate } from "@/lib/time";

export const metadata: Metadata = {
  title: "Factuur",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

function clean(v: string): string {
  return v && !v.startsWith("{{") ? v : "";
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [booking, business] = await Promise.all([
    getBookingDetail(id),
    getBusiness(),
  ]);
  if (!booking) notFound();

  const dateLabel = formatIsoDate(new Date(booking.starts_at));
  const invoice = await ensureInvoiceForBooking({
    bookingId: booking.id,
    customerName: booking.customer.full_name,
    customerEmail: booking.customer.email,
    description: `${booking.service.name} — ${dateLabel}`,
    inclCents: booking.service.price_cents,
    vatRate: business.vatRate,
    prefix: business.invoicePrefix,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <BackLink fallback={`/boekingen/${booking.id}`} />
        <InvoiceActions invoiceId={invoice.id} />
      </div>

      <div className="mt-6 rounded-lg border bg-white p-8 text-sm text-stone-900 print:border-0 print:p-0">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-2xl font-semibold tracking-tight">
              {business.name}
            </p>
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
              By {business.ownerName}
            </p>
          </div>
          <div className="text-right">
            <h1 className="text-xl font-semibold">Factuur</h1>
            <p className="mt-1 text-stone-600">{invoice.number}</p>
            <p className="text-stone-600">Datum: {invoice.issued_on}</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-stone-500">
              Van
            </p>
            <p className="mt-1 font-medium">{business.name}</p>
            {clean(business.address.street) && (
              <p>
                {business.address.street}
                <br />
                {business.address.postcode} {business.address.city}
              </p>
            )}
            {clean(business.email) && <p>{business.email}</p>}
            {clean(business.kvk) && <p>KvK: {business.kvk}</p>}
            {clean(business.btw) && <p>BTW: {business.btw}</p>}
            {clean(business.iban) && <p>IBAN: {business.iban}</p>}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-stone-500">
              Aan
            </p>
            <p className="mt-1 font-medium">{invoice.customer_name}</p>
            {invoice.customer_email && <p>{invoice.customer_email}</p>}
          </div>
        </div>

        <table className="mt-8 w-full border-collapse">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wider text-stone-500">
              <th className="py-2">Omschrijving</th>
              <th className="py-2 text-right">Bedrag</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-3">{invoice.description}</td>
              <td className="py-3 text-right">
                {formatPrice(invoice.subtotal_cents)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 ml-auto w-56 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-stone-600">Subtotaal</span>
            <span>{formatPrice(invoice.subtotal_cents)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-stone-600">
              BTW {invoice.vat_rate}%
            </span>
            <span>{formatPrice(invoice.vat_cents)}</span>
          </div>
          <div className="flex justify-between border-t py-2 font-semibold">
            <span>Totaal</span>
            <span>{formatPrice(invoice.total_cents)}</span>
          </div>
        </div>

        {invoice.vat_rate === 0 && (
          <p className="mt-6 text-xs text-stone-500">
            Vrijgesteld van BTW op grond van de kleineondernemersregeling
            (KOR).
          </p>
        )}
        <p className="mt-8 text-xs text-stone-500">
          Betaling graag binnen 14 dagen
          {clean(business.iban) ? ` op ${business.iban}` : ""} o.v.v.{" "}
          {invoice.number}.
        </p>
      </div>
    </div>
  );
}
