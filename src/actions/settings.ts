"use server";

import { z } from "zod";
import {
  updateBusinessSettings,
  updateRebookingSettings,
} from "@/lib/db/business-settings";
import { requireAdmin } from "@/lib/auth/require-admin";

const TEXT_FIELDS = [
  "name",
  "ownerName",
  "email",
  "phone",
  "street",
  "postcode",
  "city",
  "kvk",
  "btw",
  "iban",
  "invoicePrefix",
  "instagram",
  "instagramUrl",
  "tiktok",
] as const;

const schema = z.object({
  name: z.string().trim().max(160),
  ownerName: z.string().trim().max(160),
  email: z.string().trim().max(254),
  phone: z.string().trim().max(40),
  street: z.string().trim().max(160),
  postcode: z.string().trim().max(20),
  city: z.string().trim().max(120),
  kvk: z.string().trim().max(40),
  btw: z.string().trim().max(40),
  iban: z.string().trim().max(40),
  invoicePrefix: z.string().trim().max(20),
  instagram: z.string().trim().max(120),
  instagramUrl: z.string().trim().max(300),
  tiktok: z.string().trim().max(120),
  vatRate: z.coerce.number().int().min(0).max(30),
});

export async function updateBusinessSettingsAction(
  formData: FormData,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const raw: Record<string, string> = Object.fromEntries(
    TEXT_FIELDS.map((k) => [k, String(formData.get(k) ?? "")]),
  );
  const parsed = schema.safeParse({
    ...raw,
    vatRate: String(formData.get("vatRate") ?? "21"),
  });
  if (!parsed.success) return { ok: false };
  try {
    await updateBusinessSettings(parsed.data);
  } catch (err) {
    console.error("[settings] update failed:", err);
    return { ok: false };
  }
  return { ok: true };
}

const rebookingSchema = z
  .object({
    enabled: z.boolean(),
    minDays: z.coerce.number().int().min(7).max(365),
    maxDays: z.coerce.number().int().min(14).max(730),
    cooldownDays: z.coerce.number().int().min(7).max(365),
  })
  .refine((v) => v.maxDays > v.minDays, {
    message: "maxDays must be greater than minDays",
    path: ["maxDays"],
  });

export async function updateRebookingSettingsAction(
  formData: FormData,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const parsed = rebookingSchema.safeParse({
    enabled: formData.get("enabled") != null,
    minDays: String(formData.get("minDays") ?? ""),
    maxDays: String(formData.get("maxDays") ?? ""),
    cooldownDays: String(formData.get("cooldownDays") ?? ""),
  });
  if (!parsed.success) return { ok: false };
  try {
    await updateRebookingSettings(parsed.data);
  } catch (err) {
    console.error("[settings] rebooking update failed:", err);
    return { ok: false };
  }
  return { ok: true };
}
