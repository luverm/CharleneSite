import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type EmailLogRow = {
  id: number;
  to_email: string;
  subject: string;
  body: string;
  status: "sent" | "failed" | "skipped";
  error: string | null;
  context: string | null;
  created_at: string;
};

/** Best-effort: never throws, and silently no-ops if the table is absent. */
export async function recordEmail(entry: {
  to: string;
  subject: string;
  body: string;
  status: EmailLogRow["status"];
  error?: string | null;
  context?: string | null;
}): Promise<void> {
  try {
    const svc = createSupabaseServiceClient();
    await svc.from("email_log").insert({
      to_email: entry.to,
      subject: entry.subject,
      body: entry.body,
      status: entry.status,
      error: entry.error ?? null,
      context: entry.context ?? null,
    });
  } catch {
    // logging must never break the caller
  }
}

export async function listEmailLog(limit = 100): Promise<EmailLogRow[]> {
  const svc = createSupabaseServiceClient();
  const { data, error } = await svc
    .from("email_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as EmailLogRow[];
}

/** Hard-deletes the given log entries. Returns the count removed. */
export async function deleteEmailLog(ids: number[]): Promise<number> {
  if (ids.length === 0) return 0;
  const svc = createSupabaseServiceClient();
  const { error, count } = await svc
    .from("email_log")
    .delete({ count: "exact" })
    .in("id", ids);
  if (error) throw error;
  return count ?? 0;
}

export async function getEmailLogEntry(
  id: number,
): Promise<EmailLogRow | null> {
  const svc = createSupabaseServiceClient();
  const { data, error } = await svc
    .from("email_log")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as EmailLogRow | null) ?? null;
}
