import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type DueReviewRequest = {
  id: string;
  service: { name: string } | null;
  customer: { full_name: string; email: string } | null;
};

/**
 * Bookings whose visit just happened (ended in the last ~14 days) and
 * that haven't been asked for a review yet. `confirmed` past bookings
 * count as visited — same as the finance view — while cancelled and
 * no-show are excluded. `review_request_sent_at` keeps it one-shot.
 */
export async function listDueReviewRequests(): Promise<DueReviewRequest[]> {
  const svc = createSupabaseServiceClient();
  const now = Date.now();
  const from = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(now).toISOString();

  const { data, error } = await svc
    .from("bookings")
    .select(
      `id,
       service:services(name),
       customer:customers(full_name, email)`,
    )
    .in("status", ["confirmed", "completed"])
    .is("review_request_sent_at", null)
    .gte("ends_at", from)
    .lte("ends_at", to)
    .order("ends_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as DueReviewRequest[];
}

export async function markReviewRequestSent(id: string): Promise<void> {
  const svc = createSupabaseServiceClient();
  await svc
    .from("bookings")
    .update({ review_request_sent_at: new Date().toISOString() })
    .eq("id", id);
}
