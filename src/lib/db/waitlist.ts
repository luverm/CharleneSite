import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type WaitlistRow = {
  id: string;
  service_id: string | null;
  preferred_date: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  note: string | null;
  resolved: boolean;
  created_at: string;
  service?: { name: string } | null;
};

export async function insertWaitlist(input: {
  serviceId?: string | null;
  preferredDate?: string | null;
  fullName: string;
  email: string;
  phone?: string | null;
  note?: string | null;
}): Promise<void> {
  const svc = createSupabaseServiceClient();
  const { error } = await svc.from("waitlist").insert({
    service_id: input.serviceId ?? null,
    preferred_date: input.preferredDate ?? null,
    full_name: input.fullName,
    email: input.email,
    phone: input.phone ?? null,
    note: input.note ?? null,
  });
  if (error) throw error;
}

export async function getWaitlistContact(id: string): Promise<{
  fullName: string;
  email: string;
  phone: string | null;
} | null> {
  const svc = createSupabaseServiceClient();
  const { data, error } = await svc
    .from("waitlist")
    .select("full_name, email, phone")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as { full_name: string; email: string; phone: string | null };
  return { fullName: row.full_name, email: row.email, phone: row.phone };
}

export async function listWaitlist(): Promise<WaitlistRow[]> {
  const svc = createSupabaseServiceClient();
  const { data, error } = await svc
    .from("waitlist")
    .select("*, service:services(name)")
    .order("resolved", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as WaitlistRow[];
}

export type WaitlistDayEntry = {
  id: string;
  full_name: string;
  preferred_date: string;
};

/** Open (unresolved) waitlist entries with a preferred date in the range. */
export async function listOpenWaitlistInRange(
  from: string,
  to: string,
): Promise<WaitlistDayEntry[]> {
  try {
    const svc = createSupabaseServiceClient();
    const { data, error } = await svc
      .from("waitlist")
      .select("id, full_name, preferred_date")
      .eq("resolved", false)
      .not("preferred_date", "is", null)
      .gte("preferred_date", from)
      .lte("preferred_date", to)
      .order("created_at", { ascending: true });
    if (error) return [];
    return (data ?? []) as WaitlistDayEntry[];
  } catch {
    return [];
  }
}

export type WaitlistMatch = { id: string; full_name: string; email: string };

/**
 * Open waitlist entries that fit a freed slot: the service matches (or
 * the entry is service-flexible) AND the date matches (or the entry is
 * date-flexible). A solo salon's open waitlist is tiny, so matching in
 * memory is simpler and avoids PostgREST or-string quirks.
 */
export async function findWaitlistMatches(args: {
  serviceId: string;
  date: string;
}): Promise<WaitlistMatch[]> {
  const svc = createSupabaseServiceClient();
  const { data, error } = await svc
    .from("waitlist")
    .select("id, full_name, email, service_id, preferred_date")
    .eq("resolved", false);
  if (error) throw error;

  const rows = (data ?? []) as {
    id: string;
    full_name: string;
    email: string;
    service_id: string | null;
    preferred_date: string | null;
  }[];

  const seen = new Set<string>();
  const matches: WaitlistMatch[] = [];
  for (const r of rows) {
    const serviceFits =
      r.service_id === null || r.service_id === args.serviceId;
    const dateFits =
      r.preferred_date === null || r.preferred_date === args.date;
    if (!serviceFits || !dateFits) continue;
    const key = r.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push({ id: r.id, full_name: r.full_name, email: r.email });
  }
  return matches;
}

export async function setWaitlistResolved(
  id: string,
  resolved: boolean,
): Promise<void> {
  const svc = createSupabaseServiceClient();
  const { error } = await svc
    .from("waitlist")
    .update({ resolved })
    .eq("id", id);
  if (error) throw error;
}

/**
 * The customer just booked, so any open waitlist entry of theirs that
 * this booking satisfies (same service, or service-flexible) is done.
 * `email` is citext, so the match is case-insensitive. Returns how
 * many entries were closed.
 */
export async function resolveWaitlistForCustomer(args: {
  email: string;
  serviceId: string;
}): Promise<number> {
  const svc = createSupabaseServiceClient();
  const { data, error } = await svc
    .from("waitlist")
    .select("id, service_id")
    .eq("resolved", false)
    .eq("email", args.email);
  if (error) throw error;

  const ids = ((data ?? []) as { id: string; service_id: string | null }[])
    .filter((r) => r.service_id === null || r.service_id === args.serviceId)
    .map((r) => r.id);
  if (ids.length === 0) return 0;

  const { error: upErr } = await svc
    .from("waitlist")
    .update({ resolved: true })
    .in("id", ids);
  if (upErr) throw upErr;
  return ids.length;
}
