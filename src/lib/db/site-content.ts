import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { contentDefaults } from "@/content/editable";

/**
 * Every editable text block resolved to its current value: built-in
 * defaults overlaid with admin overrides from `site_content`. Falls
 * back to pure defaults if migration 0020 isn't applied yet.
 */
export async function getResolvedContent(): Promise<Record<string, string>> {
  const merged = contentDefaults();
  try {
    const svc = createSupabaseServiceClient();
    const { data, error } = await svc
      .from("site_content")
      .select("key, value");
    if (error) return merged;
    for (const row of (data ?? []) as { key: string; value: string }[]) {
      if (row.key in merged) merged[row.key] = row.value;
    }
  } catch {
    /* table missing / offline — defaults are fine */
  }
  return merged;
}

export async function saveSiteContent(
  updates: Record<string, string>,
): Promise<void> {
  const svc = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const rows = Object.entries(updates).map(([key, value]) => ({
    key,
    value,
    updated_at: now,
  }));
  const { error } = await svc
    .from("site_content")
    .upsert(rows, { onConflict: "key" });
  if (error) throw error;
}

/** Reads a single site_content value, or null if absent/unavailable. */
export async function getSiteValue(key: string): Promise<string | null> {
  try {
    const svc = createSupabaseServiceClient();
    const { data, error } = await svc
      .from("site_content")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error || !data) return null;
    return (data as { value: string }).value;
  } catch {
    return null;
  }
}

export async function setSiteValue(key: string, value: string): Promise<void> {
  const svc = createSupabaseServiceClient();
  const { error } = await svc.from("site_content").upsert(
    { key, value, updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
  if (error) throw error;
}

/** Reads a site_content value as a JSON string array, or [] if absent/invalid. */
export async function getSiteStringArray(key: string): Promise<string[]> {
  const raw = await getSiteValue(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

/** Reads a site_content value as a JSON string map, or {} if absent/invalid. */
export async function getSiteStringRecord(
  key: string,
): Promise<Record<string, string>> {
  const raw = await getSiteValue(key);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}
