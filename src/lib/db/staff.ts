import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function getDefaultStaffId(): Promise<string> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("staff")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("No active staff configured — seed the database");
  return data.id;
}
