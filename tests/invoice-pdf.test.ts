import { describe, it, expect } from "vitest";
import { buildInvoicePdf } from "@/lib/invoice-pdf";
import type { InvoiceRow, InvoiceLine } from "@/lib/db/invoices";
import type { BusinessInfo } from "@/lib/db/business-settings";

const business: BusinessInfo = {
  name: "Hair and Bridal by Jeanine",
  ownerName: "Jeanine",
  tagline: "",
  email: "info@example.nl",
  phone: "",
  address: {
    street: "Aalbessestraat 17",
    postcode: "4413 DG",
    city: "Krabbendijke",
  },
  kvk: "97905674",
  btw: "{{BTW_NUMMER}}",
  iban: "NL00BANK0123456789",
  vatRate: 21,
  invoicePrefix: "",
  socials: { instagram: "", instagramUrl: "", tiktok: "" },
  rebooking: { enabled: true, minDays: 42, maxDays: 120, cooldownDays: 60 },
};

function makeInvoice(over: Partial<InvoiceRow> = {}): InvoiceRow {
  return {
    id: "inv-1",
    number: "2026-001",
    booking_id: null,
    customer_name: "Anouk de Wit",
    customer_email: "anouk@example.nl",
    issued_on: "2026-05-21",
    description: "Bruidsstyling proefsessie",
    subtotal_cents: 10000,
    vat_rate: 21,
    vat_cents: 2100,
    total_cents: 12100,
    deposit_cents: 0,
    created_at: "2026-05-21T10:00:00Z",
    ...over,
  };
}

function isPdf(bytes: Uint8Array): boolean {
  return Buffer.from(bytes.slice(0, 5)).toString("latin1") === "%PDF-";
}

describe("buildInvoicePdf", () => {
  it("produces a valid PDF for a single-line invoice", async () => {
    const pdf = await buildInvoicePdf(makeInvoice(), [], business);
    expect(pdf).toBeInstanceOf(Uint8Array);
    expect(pdf.length).toBeGreaterThan(1000);
    expect(isPdf(pdf)).toBe(true);
  });

  it("handles itemised lines, a deposit and unencodable characters", async () => {
    const lines: InvoiceLine[] = [
      {
        id: "l1",
        invoice_id: "inv-1",
        // emoji + non-WinAnsi glyphs must not crash font encoding
        description: "Bruidskapsel proef \u{1F48D} — styling",
        quantity: 1,
        unit_cents: 15000,
        amount_cents: 15000,
        sort: 0,
      },
      {
        id: "l2",
        invoice_id: "inv-1",
        description: "Reiskosten",
        quantity: 3,
        unit_cents: 1000,
        amount_cents: 3000,
        sort: 1,
      },
    ];
    const pdf = await buildInvoicePdf(
      makeInvoice({
        deposit_cents: 5000,
        subtotal_cents: 18000,
        total_cents: 18000,
        vat_rate: 0,
        vat_cents: 0,
      }),
      lines,
      business,
    );
    expect(isPdf(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(1000);
  });
});
