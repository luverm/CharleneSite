import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/** A customer with this many `no_show` bookings gets flagged. */
export const NO_SHOW_FLAG_THRESHOLD = 2;

/**
 * For the given customers, returns customerId -> no-show count for those
 * currently flagged: at/above the threshold AND with a higher count than
 * Jeanine last acknowledged. Degrades gracefully if the ack column has
 * not been migrated yet (treats acknowledged as 0).
 */
export async function getNoShowFlags(
  customerIds: string[],
): Promise<Map<string, number>> {
  const ids = [...new Set(customerIds)].filter(Boolean);
  if (ids.length === 0) return new Map();
  const svc = createSupabaseServiceClient();

  const { data: ns, error: nsErr } = await svc
    .from("bookings")
    .select("customer_id")
    .eq("status", "no_show")
    .in("customer_id", ids);
  if (nsErr) throw nsErr;

  const counts = new Map<string, number>();
  for (const r of (ns ?? []) as { customer_id: string }[]) {
    counts.set(r.customer_id, (counts.get(r.customer_id) ?? 0) + 1);
  }

  const ack = new Map<string, number>();
  const { data: cust, error: cErr } = await svc
    .from("customers")
    .select("id, no_show_ack_count")
    .in("id", ids);
  if (!cErr) {
    for (const c of (cust ?? []) as {
      id: string;
      no_show_ack_count: number | null;
    }[]) {
      ack.set(c.id, c.no_show_ack_count ?? 0);
    }
  }

  const flagged = new Map<string, number>();
  for (const [id, n] of counts) {
    if (n >= NO_SHOW_FLAG_THRESHOLD && n > (ack.get(id) ?? 0)) {
      flagged.set(id, n);
    }
  }
  return flagged;
}

async function countNoShows(customerId: string): Promise<number> {
  const svc = createSupabaseServiceClient();
  const { count, error } = await svc
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "no_show")
    .eq("customer_id", customerId);
  if (error) throw error;
  return count ?? 0;
}

/** Acknowledge the current no-show count so the warning is hidden. */
export async function dismissNoShowFlag(customerId: string): Promise<void> {
  const current = await countNoShows(customerId);
  const svc = createSupabaseServiceClient();
  const { error } = await svc
    .from("customers")
    .update({ no_show_ack_count: current })
    .eq("id", customerId);
  if (error) throw error;
}
