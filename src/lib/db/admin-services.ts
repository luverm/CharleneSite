import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { compareServices } from "@/lib/services-format";
import type { Service } from "@/lib/db/services";

export async function listAllServices(): Promise<Service[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("services")
    .select(
      "id, slug, name, description, kind, duration_min, buffer_min, price_cents, is_online_bookable, is_active, sort_order",
    )
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Service[]).sort(compareServices);
}

export type ServiceUpsert = {
  id?: string;
  slug: string;
  name: string;
  description: string | null;
  kind: "regular";
  duration_min: number;
  buffer_min: number;
  price_cents: number;
  is_online_bookable: boolean;
  is_active: boolean;
  sort_order: number;
};

export async function upsertService(input: ServiceUpsert): Promise<Service> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("services")
    .upsert(input, { onConflict: "id" })
    .select(
      "id, slug, name, description, kind, duration_min, buffer_min, price_cents, is_online_bookable, is_active, sort_order",
    )
    .single();
  if (error || !data) throw error ?? new Error("Failed to upsert service");
  return data as Service;
}

export async function deleteService(id: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) throw error;
}

/** Assigns sequential sort_order values to the given service ids in order. */
export async function setServiceOrder(ids: string[]): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const results = await Promise.all(
    ids.map((id, i) =>
      supabase
        .from("services")
        .update({ sort_order: (i + 1) * 10 })
        .eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}
