import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type AdminNotification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

/** Best-effort: never throws, so an insert failure never blocks a booking. */
export async function recordAdminNotification(input: {
  kind: string;
  title: string;
  body?: string | null;
  href?: string | null;
}): Promise<void> {
  try {
    const svc = createSupabaseServiceClient();
    await svc.from("admin_notifications").insert({
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
    });
  } catch (err) {
    console.error("[notifications] record failed:", err);
  }
}

export async function listAdminNotifications(
  limit = 100,
): Promise<AdminNotification[]> {
  const svc = createSupabaseServiceClient();
  const { data, error } = await svc
    .from("admin_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AdminNotification[];
}

/** Returns 0 on any error so a missing migration doesn't break the layout. */
export async function countUnreadAdminNotifications(): Promise<number> {
  try {
    const svc = createSupabaseServiceClient();
    const { count } = await svc
      .from("admin_notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function markAllAdminNotificationsRead(): Promise<void> {
  const svc = createSupabaseServiceClient();
  const { error } = await svc
    .from("admin_notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw error;
}

export async function markAdminNotificationRead(id: string): Promise<void> {
  const svc = createSupabaseServiceClient();
  const { error } = await svc
    .from("admin_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Hard-deletes the given notifications. */
export async function deleteAdminNotifications(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const svc = createSupabaseServiceClient();
  const { error, count } = await svc
    .from("admin_notifications")
    .delete({ count: "exact" })
    .in("id", ids);
  if (error) throw error;
  return count ?? 0;
}
