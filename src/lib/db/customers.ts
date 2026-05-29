import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type Customer = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
};

type CustomerUpsert = {
  email: string;
  full_name: string;
  phone?: string;
};

/**
 * Insert-or-update customer keyed by email (citext, unique).
 * Returns the row including the (possibly pre-existing) `id`.
 */
export async function upsertCustomerByEmail(input: CustomerUpsert): Promise<Customer> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("customers")
    .upsert(
      {
        email: input.email,
        full_name: input.full_name,
        phone: input.phone ?? null,
      },
      { onConflict: "email" },
    )
    .select("id, email, full_name, phone")
    .single();

  if (error || !data) throw error ?? new Error("Failed to upsert customer");
  return data as Customer;
}
