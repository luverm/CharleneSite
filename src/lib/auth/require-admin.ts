import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Authorises an admin-only Server Action. Server Actions are public
 * POST endpoints — middleware guards pages, NOT actions — so every
 * privileged action must call this itself. Throws when the caller is
 * not an authenticated, active staff member.
 */
export async function requireAdmin(): Promise<{
  userId: string;
  email: string | null;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const svc = createSupabaseServiceClient();
  const { data, error } = await svc
    .from("staff")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) throw new Error("FORBIDDEN");

  return { userId: user.id, email: user.email ?? null };
}
