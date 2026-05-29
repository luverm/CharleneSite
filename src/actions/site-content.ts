"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { saveSiteContent } from "@/lib/db/site-content";
import { ALL_BLOCKS } from "@/content/editable";

const VALID_KEYS = new Set(ALL_BLOCKS.map((b) => b.key));

export async function saveSiteContentAction(
  updates: unknown,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = z
    .record(z.string(), z.string().max(5000))
    .safeParse(updates);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer" };

  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (VALID_KEYS.has(key)) clean[key] = value;
  }
  if (Object.keys(clean).length === 0) {
    return { ok: false, error: "Niets om op te slaan" };
  }

  try {
    await saveSiteContent(clean);
  } catch (err) {
    console.error("[site-content] save failed:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Opslaan mislukt",
    };
  }

  revalidatePath("/");
  revalidatePath("/diensten");
  return { ok: true };
}
