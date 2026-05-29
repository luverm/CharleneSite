import "server-only";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import type { InvoiceRow, InvoiceLine } from "@/lib/db/invoices";
import type { BusinessInfo } from "@/lib/db/business-settings";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 56;
const CONTENT_W = PAGE_W - MARGIN * 2;

type Ink = ReturnType<typeof rgb>;
const INK: Ink = rgb(0.17, 0.15, 0.13);
const MUTED: Ink = rgb(0.45, 0.43, 0.41);
const BORDER: Ink = rgb(0.86, 0.84, 0.82);

/** Hide unfilled placeholder business fields, same as the on-screen invoice. */
function clean(v: string): string {
  return v && !v.startsWith("{{") ? v : "";
}

/** Drop glyphs the standard PDF fonts (WinAnsi) cannot encode. */
function safe(v: string): string {
  return v
    .replace(/[\t\r\n]+/g, " ")
    .replace(/[^\x20-\x7E\xA0-\xFF\u20AC]/g, "?");
}

/** Whole-euro amount, matching the on-screen formatPrice (no decimals). */
function euro(cents: number): string {
  const n = new Intl.NumberFormat("nl-NL", {
    maximumFractionDigits: 0,
  }).format(Math.round(cents / 100));
  return `€ ${n}`;
}

function wrap(
  text: string,
  font: PDFFont,
  size: number,
  maxW: number,
): string[] {
  const words = safe(text).split(" ").filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (cur && font.widthOfTextAtSize(test, size) > maxW) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * Renders an invoice to a downloadable PDF that mirrors the on-screen
 * layout: logo header, sender/recipient blocks, an itemised table and a
 * totals summary (including any deposit already paid).
 */
export async function buildInvoicePdf(
  invoice: InvoiceRow,
  lines: InvoiceLine[],
  business: BusinessInfo,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Factuur ${invoice.number}`);
  doc.setProducer(business.name);

  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const draw = (
    s: string,
    x: number,
    size: number,
    opts: { font?: PDFFont; color?: Ink } = {},
  ) => {
    page.drawText(safe(s), {
      x,
      y,
      size,
      font: opts.font ?? reg,
      color: opts.color ?? INK,
    });
  };

  const drawRight = (
    s: string,
    xRight: number,
    size: number,
    opts: { font?: PDFFont; color?: Ink } = {},
  ) => {
    const font = opts.font ?? reg;
    const w = font.widthOfTextAtSize(safe(s), size);
    draw(s, xRight - w, size, opts);
  };

  const hr = (yPos: number) => {
    page.drawLine({
      start: { x: MARGIN, y: yPos },
      end: { x: PAGE_W - MARGIN, y: yPos },
      thickness: 0.75,
      color: BORDER,
    });
  };

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  // ---- Header: business name + tagline (left), invoice meta (right) ----
  draw(business.name, MARGIN, 16, { font: bold });
  y -= 13;
  draw(`By ${business.ownerName}`.toUpperCase(), MARGIN, 8, { color: MUTED });
  const headerBottom = y;

  // Right-aligned invoice meta, anchored to the top.
  y = PAGE_H - MARGIN - 12;
  drawRight("Factuur", PAGE_W - MARGIN, 15, { font: bold });
  y -= 17;
  drawRight(invoice.number, PAGE_W - MARGIN, 10, { color: MUTED });
  y -= 14;
  drawRight(`Datum: ${invoice.issued_on}`, PAGE_W - MARGIN, 10, {
    color: MUTED,
  });

  // ---- Sender / recipient ----
  y = headerBottom - 34;
  hr(y + 18);

  const colVan = MARGIN;
  const colAan = MARGIN + CONTENT_W / 2;
  const topY = y;

  const senderLines: { s: string; font?: PDFFont }[] = [
    { s: business.name, font: bold },
  ];
  if (clean(business.address.street)) {
    senderLines.push({ s: business.address.street });
    senderLines.push({
      s: `${business.address.postcode} ${business.address.city}`.trim(),
    });
  }
  if (clean(business.email)) senderLines.push({ s: business.email });
  if (clean(business.kvk)) senderLines.push({ s: `KvK: ${business.kvk}` });
  if (clean(business.btw)) senderLines.push({ s: `BTW: ${business.btw}` });
  if (clean(business.iban)) senderLines.push({ s: `IBAN: ${business.iban}` });

  const recipientLines: { s: string; font?: PDFFont }[] = [
    { s: invoice.customer_name, font: bold },
  ];
  if (invoice.customer_email) {
    recipientLines.push({ s: invoice.customer_email });
  }

  const drawBlock = (
    label: string,
    x: number,
    entries: { s: string; font?: PDFFont }[],
  ) => {
    y = topY;
    draw(label, x, 8, { color: MUTED });
    y -= 15;
    for (const e of entries) {
      draw(e.s, x, 10, { font: e.font });
      y -= 13;
    }
    return y;
  };

  const vanEnd = drawBlock("VAN", colVan, senderLines);
  const aanEnd = drawBlock("AAN", colAan, recipientLines);
  y = Math.min(vanEnd, aanEnd) - 16;

  // ---- Line-item table ----
  const amountRight = PAGE_W - MARGIN;
  const descMaxW = CONTENT_W - 130;

  draw("OMSCHRIJVING", MARGIN, 8, { color: MUTED });
  drawRight("BEDRAG", amountRight, 8, { color: MUTED });
  y -= 8;
  hr(y);

  const rows =
    lines.length > 0
      ? lines.map((l) => ({
          desc:
            l.quantity !== 1
              ? `${l.description} (${l.quantity} × ${euro(l.unit_cents)})`
              : l.description,
          amount: l.amount_cents,
        }))
      : [{ desc: invoice.description, amount: invoice.subtotal_cents }];

  for (const row of rows) {
    const wrapped = wrap(row.desc, reg, 10, descMaxW);
    const rowH = 14 + wrapped.length * 13;
    if (y - rowH < MARGIN + 80) newPage();
    y -= 14;
    drawRight(euro(row.amount), amountRight, 10);
    for (const line of wrapped) {
      draw(line, MARGIN, 10);
      y -= 13;
    }
    hr(y);
  }

  // ---- Totals ----
  const deposit = invoice.deposit_cents ?? 0;
  const due = Math.max(0, invoice.total_cents - deposit);
  const totalsX = PAGE_W - MARGIN - 210;

  const totalsRow = (
    label: string,
    value: string,
    opts: { strong?: boolean; rule?: boolean } = {},
  ) => {
    y -= opts.strong ? 19 : 16;
    if (opts.rule) {
      page.drawLine({
        start: { x: totalsX, y: y + 12 },
        end: { x: PAGE_W - MARGIN, y: y + 12 },
        thickness: 0.75,
        color: BORDER,
      });
    }
    const font = opts.strong ? bold : reg;
    draw(label, totalsX, 10, { font, color: opts.strong ? INK : MUTED });
    drawRight(value, PAGE_W - MARGIN, 10, { font });
  };

  if (y < MARGIN + 170) newPage();
  y -= 8;
  totalsRow("Subtotaal", euro(invoice.subtotal_cents));
  totalsRow(`BTW ${invoice.vat_rate}%`, euro(invoice.vat_cents));
  totalsRow("Totaal", euro(invoice.total_cents), { strong: true, rule: true });
  if (deposit > 0) {
    totalsRow("Reeds voldaan (aanbetaling)", `-${euro(deposit)}`);
    totalsRow("Nog te voldoen", euro(due), { strong: true, rule: true });
  }

  // ---- Footer notes ----
  y -= 30;
  if (invoice.vat_rate === 0) {
    draw(
      "Vrijgesteld van BTW op grond van de kleineondernemersregeling (KOR).",
      MARGIN,
      8,
      { color: MUTED },
    );
    y -= 16;
  }
  const ibanNote = clean(business.iban) ? ` op ${business.iban}` : "";
  draw(
    `Betaling graag binnen 14 dagen${ibanNote} o.v.v. ${invoice.number}.`,
    MARGIN,
    8,
    { color: MUTED },
  );

  return doc.save();
}
