"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  PORTFOLIO_BUCKET,
  ABOUT_IMAGE_KEY,
  savePortfolioOrder,
} from "@/lib/portfolio";
import { setSiteValue } from "@/lib/db/site-content";
import { requireAdmin } from "@/lib/auth/require-admin";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 8 * 1024 * 1024;

function safeName(original: string): string {
  const dot = original.lastIndexOf(".");
  const ext = dot >= 0 ? original.slice(dot).toLowerCase() : ".jpg";
  const base = (dot >= 0 ? original.slice(0, dot) : original)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "foto";
  return `${Date.now()}-${base}${ext}`;
}

export async function uploadPortfolio(
  formData: FormData,
): Promise<{ ok: boolean; uploaded: number; message?: string }> {
  await requireAdmin();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return { ok: false, uploaded: 0, message: "Geen bestanden." };

  const svc = createSupabaseServiceClient();
  let uploaded = 0;
  for (const file of files) {
    if (file.size === 0) continue;
    if (!ALLOWED.includes(file.type)) {
      return { ok: false, uploaded, message: `Type niet toegestaan: ${file.type}` };
    }
    if (file.size > MAX_BYTES) {
      return { ok: false, uploaded, message: `${file.name} is te groot (max 8MB).` };
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error } = await svc.storage
      .from(PORTFOLIO_BUCKET)
      .upload(safeName(file.name), bytes, { contentType: file.type });
    if (error) {
      console.error("[portfolio] upload failed:", error);
      return {
        ok: false,
        uploaded,
        message:
          "Upload mislukt. Bestaat de Storage-bucket 'portfolio' al?",
      };
    }
    uploaded += 1;
  }
  return { ok: true, uploaded };
}

/** Persists the display order of the portfolio (array of storage names). */
export async function reorderPortfolio(
  names: string[],
): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (
    !Array.isArray(names) ||
    names.length > 500 ||
    names.some((n) => typeof n !== "string")
  ) {
    return { ok: false };
  }
  try {
    await savePortfolioOrder(names);
  } catch (err) {
    console.error("[portfolio] reorder failed:", err);
    return { ok: false };
  }
  revalidatePath("/");
  revalidatePath("/portfolio");
  revalidatePath("/instellingen/portfolio");
  return { ok: true };
}

/** Picks which portfolio photo is shown in the homepage "Over" block. */
export async function setAboutImage(
  name: string,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (typeof name !== "string" || name.length > 300) return { ok: false };
  try {
    await setSiteValue(ABOUT_IMAGE_KEY, name);
  } catch (err) {
    console.error("[portfolio] set about image failed:", err);
    return { ok: false };
  }
  revalidatePath("/");
  revalidatePath("/instellingen/portfolio");
  return { ok: true };
}

export async function deletePortfolio(
  name: string,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  try {
    const svc = createSupabaseServiceClient();
    const { error } = await svc.storage
      .from(PORTFOLIO_BUCKET)
      .remove([name]);
    if (error) return { ok: false };
  } catch {
    return { ok: false };
  }
  return { ok: true };
}
