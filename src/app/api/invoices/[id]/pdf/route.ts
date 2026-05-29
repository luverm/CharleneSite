import { getInvoiceWithLines } from "@/lib/db/invoices";
import { getBusiness } from "@/lib/db/business-settings";
import { requireAdmin } from "@/lib/auth/require-admin";
import { buildInvoicePdf } from "@/lib/invoice-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch {
    return new Response("Niet geautoriseerd", { status: 401 });
  }

  const { id } = await params;
  const result = await getInvoiceWithLines(id);
  if (!result) return new Response("Factuur niet gevonden", { status: 404 });

  const business = await getBusiness();
  const pdf = await buildInvoicePdf(result.invoice, result.lines, business);
  const filename = `Factuur-${result.invoice.number}`.replace(
    /[^A-Za-z0-9._-]/g,
    "_",
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
