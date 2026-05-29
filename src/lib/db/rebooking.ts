import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getBusiness } from "@/lib/db/business-settings";

export type RebookingCandidate = {
  customer_id: string;
  email: string;
  full_name: string;
  last_service: string;
  last_visit: string;
};

export async function listRebookingDue(): Promise<RebookingCandidate[]> {
  const { rebooking } = await getBusiness();
  if (!rebooking.enabled) return [];

  const svc = createSupabaseServiceClient();
  const { data, error } = await svc.rpc("rebooking_candidates", {
    min_days: rebooking.minDays,
    max_days: rebooking.maxDays,
    cooldown_days: rebooking.cooldownDays,
  });
  if (error) throw error;
  return (data ?? []) as unknown as RebookingCandidate[];
}

export async function markRebookingNudged(customerId: string): Promise<void> {
  const svc = createSupabaseServiceClient();
  await svc
    .from("customers")
    .update({ rebooking_nudge_sent_at: new Date().toISOString() })
    .eq("id", customerId);
}
