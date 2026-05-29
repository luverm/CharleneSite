import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Link the seeded (orphan) staff row to this auth user — but only if
 * (a) this user isn't already linked and (b) an active staff row with
 * `user_id IS NULL` is waiting to be claimed.
 *
 * Runs with the service-role client so it bypasses the RLS policies
 * that would otherwise block a brand-new auth user from updating staff.
 */
export async function claimStaffIfUnlinked(
  userId: string,
  email: string | null,
): Promise<void> {
  const svc = createSupabaseServiceClient();

  const { data: existing } = await svc
    .from("staff")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return;

  const { data: orphan } = await svc
    .from("staff")
    .select("id")
    .is("user_id", null)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!orphan) return;

  const update: { user_id: string; email?: string } = { user_id: userId };
  if (email) update.email = email;
  await svc.from("staff").update(update).eq("id", orphan.id);
}

/**
 * The admin setup page is open only until the seeded staff row has been
 * claimed. Returns true when no active staff row is linked to an auth
 * user yet *and* there is an unclaimed active staff row to link.
 */
export async function needsAdminSetup(): Promise<boolean> {
  const svc = createSupabaseServiceClient();

  const { data: linked } = await svc
    .from("staff")
    .select("id")
    .not("user_id", "is", null)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (linked) return false;

  const { data: orphan } = await svc
    .from("staff")
    .select("id")
    .is("user_id", null)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return Boolean(orphan);
}
