"use server";

import { z } from "zod";
import { buildBookingsCsv } from "@/lib/db/finance";
import { getBusiness } from "@/lib/db/business-settings";
import { requireAdmin } from "@/lib/auth/require-admin";

const schema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function exportBookingsCsv(
  fromDate: string,
  toDate: string,
): Promise<{ ok: true; csv: string } | { ok: false }> {
  await requireAdmin();
  const parsed = schema.safeParse({ from: fromDate, to: toDate });
  if (!parsed.success) return { ok: false };
  try {
    const { vatRate } = await getBusiness();
    const csv = await buildBookingsCsv(
      parsed.data.from,
      parsed.data.to,
      vatRate,
    );
    return { ok: true, csv };
  } catch (err) {
    console.error("[finance] csv export failed:", err);
    return { ok: false };
  }
}
