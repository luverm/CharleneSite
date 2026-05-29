import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { compareServices } from "@/lib/services-format";
import type { Service, ServiceKind } from "@/lib/services-format";

// Re-export for backwards-compat with existing server-side imports.
// Client components must import these from "@/lib/services-format"
// to avoid pulling in next/headers via the supabase server client.
export type { Service, ServiceKind } from "@/lib/services-format";
export { formatPrice, formatDuration } from "@/lib/services-format";

export async function listActiveServices(kind?: ServiceKind): Promise<Service[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("services")
    .select(
      "id, slug, name, description, kind, duration_min, buffer_min, price_cents, is_online_bookable, sort_order",
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (kind) query = query.eq("kind", kind);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as Service[]).sort(compareServices);
}
