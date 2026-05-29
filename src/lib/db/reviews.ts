import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type Review = {
  id: string;
  author: string;
  quote: string;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
};

/** Visible reviews for the public site. Returns [] on any error. */
export async function listVisibleReviews(): Promise<Review[]> {
  try {
    const svc = createSupabaseServiceClient();
    const { data, error } = await svc
      .from("reviews")
      .select("*")
      .eq("is_visible", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as Review[];
  } catch {
    return [];
  }
}

export async function listAllReviews(): Promise<Review[]> {
  const svc = createSupabaseServiceClient();
  const { data, error } = await svc
    .from("reviews")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Review[];
}

export async function createReview(input: {
  author: string;
  quote: string;
}): Promise<void> {
  const svc = createSupabaseServiceClient();
  const { error } = await svc.from("reviews").insert({
    author: input.author,
    quote: input.quote,
  });
  if (error) throw error;
}

/** Customer-submitted review: hidden until Jeanine approves it. */
export async function createCustomerReview(input: {
  bookingId: string;
  author: string;
  quote: string;
}): Promise<void> {
  const svc = createSupabaseServiceClient();
  const { error } = await svc.from("reviews").insert({
    booking_id: input.bookingId,
    author: input.author,
    quote: input.quote,
    is_visible: false,
  });
  if (error) throw error;
}

/** Review submitted from the public site: hidden until Jeanine approves it. */
export async function createPublicReview(input: {
  author: string;
  quote: string;
}): Promise<void> {
  const svc = createSupabaseServiceClient();
  const { error } = await svc.from("reviews").insert({
    author: input.author,
    quote: input.quote,
    is_visible: false,
  });
  if (error) throw error;
}

export async function hasReviewForBooking(
  bookingId: string,
): Promise<boolean> {
  const svc = createSupabaseServiceClient();
  const { data, error } = await svc
    .from("reviews")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function setReviewVisible(
  id: string,
  visible: boolean,
): Promise<void> {
  const svc = createSupabaseServiceClient();
  const { error } = await svc
    .from("reviews")
    .update({ is_visible: visible })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteReview(id: string): Promise<void> {
  const svc = createSupabaseServiceClient();
  const { error } = await svc.from("reviews").delete().eq("id", id);
  if (error) throw error;
}
