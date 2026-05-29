import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { business } from "@/content/business";

export const REBOOKING_DEFAULTS = {
  enabled: true,
  minDays: 42,
  maxDays: 120,
  cooldownDays: 60,
} as const;

export type RebookingSettings = {
  enabled: boolean;
  minDays: number;
  maxDays: number;
  cooldownDays: number;
};

export type BusinessInfo = {
  name: string;
  ownerName: string;
  tagline: string;
  email: string;
  phone: string;
  address: { street: string; postcode: string; city: string };
  kvk: string;
  btw: string;
  iban: string;
  vatRate: number;
  invoicePrefix: string;
  socials: { instagram: string; instagramUrl: string; tiktok: string };
  rebooking: RebookingSettings;
};

export type BusinessSettingsRow = {
  name: string | null;
  owner_name: string | null;
  tagline: string | null;
  email: string | null;
  phone: string | null;
  address_street: string | null;
  address_postcode: string | null;
  address_city: string | null;
  kvk: string | null;
  btw: string | null;
  iban: string | null;
  vat_rate: number | null;
  invoice_prefix: string | null;
  instagram: string | null;
  instagram_url: string | null;
  tiktok: string | null;
  rebooking_enabled: boolean | null;
  rebooking_min_days: number | null;
  rebooking_max_days: number | null;
  rebooking_cooldown_days: number | null;
};

function pick(dbValue: string | null | undefined, fallback: string): string {
  const v = dbValue?.trim();
  return v ? v : fallback;
}

function posInt(value: number | null | undefined, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : fallback;
}

function readRebooking(row: BusinessSettingsRow | null): RebookingSettings {
  const minDays = posInt(row?.rebooking_min_days, REBOOKING_DEFAULTS.minDays);
  let maxDays = posInt(row?.rebooking_max_days, REBOOKING_DEFAULTS.maxDays);
  // A nonsensical window (max ≤ min) would mail nobody — fall back so a
  // bad row never silently disables the feature.
  if (maxDays <= minDays) maxDays = REBOOKING_DEFAULTS.maxDays;
  return {
    enabled: row?.rebooking_enabled ?? REBOOKING_DEFAULTS.enabled,
    minDays,
    maxDays,
    cooldownDays: posInt(
      row?.rebooking_cooldown_days,
      REBOOKING_DEFAULTS.cooldownDays,
    ),
  };
}

/** Static defaults merged with any DB overrides. Never throws. */
export async function getBusiness(): Promise<BusinessInfo> {
  let row: BusinessSettingsRow | null = null;
  try {
    const svc = createSupabaseServiceClient();
    const { data } = await svc
      .from("business_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    row = (data as BusinessSettingsRow | null) ?? null;
  } catch {
    row = null;
  }

  return {
    name: pick(row?.name, business.name),
    ownerName: pick(row?.owner_name, business.ownerName),
    tagline: pick(row?.tagline, business.tagline),
    email: pick(row?.email, business.email),
    phone: pick(row?.phone, business.phone),
    address: {
      street: pick(row?.address_street, business.address.street),
      postcode: pick(row?.address_postcode, business.address.postcode),
      city: pick(row?.address_city, business.address.city),
    },
    kvk: pick(row?.kvk, business.kvk),
    btw: pick(row?.btw, business.btw),
    iban: pick(row?.iban, business.iban),
    vatRate:
      typeof row?.vat_rate === "number" && row.vat_rate >= 0
        ? row.vat_rate
        : 21,
    invoicePrefix: pick(row?.invoice_prefix, ""),
    socials: {
      instagram: pick(row?.instagram, business.socials.instagram),
      instagramUrl: pick(row?.instagram_url, business.socials.instagramUrl),
      tiktok: pick(row?.tiktok, business.socials.tiktok),
    },
    rebooking: readRebooking(row),
  };
}

export async function updateRebookingSettings(
  input: RebookingSettings,
): Promise<void> {
  const svc = createSupabaseServiceClient();
  const { error } = await svc.from("business_settings").upsert({
    id: 1,
    rebooking_enabled: input.enabled,
    rebooking_min_days: input.minDays,
    rebooking_max_days: input.maxDays,
    rebooking_cooldown_days: input.cooldownDays,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function updateBusinessSettings(input: {
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  street: string;
  postcode: string;
  city: string;
  kvk: string;
  btw: string;
  iban: string;
  vatRate: number;
  invoicePrefix: string;
  instagram: string;
  instagramUrl: string;
  tiktok: string;
}): Promise<void> {
  const svc = createSupabaseServiceClient();
  const { error } = await svc.from("business_settings").upsert({
    id: 1,
    name: input.name || null,
    owner_name: input.ownerName || null,
    email: input.email || null,
    phone: input.phone || null,
    address_street: input.street || null,
    address_postcode: input.postcode || null,
    address_city: input.city || null,
    kvk: input.kvk || null,
    btw: input.btw || null,
    iban: input.iban || null,
    vat_rate: Number.isFinite(input.vatRate) ? input.vatRate : 21,
    invoice_prefix: input.invoicePrefix || null,
    instagram: input.instagram || null,
    instagram_url: input.instagramUrl || null,
    tiktok: input.tiktok || null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
