-- ============================================================
-- 0014_review_collection.sql
-- Customers can submit a review after their visit. Submissions
-- land hidden (is_visible=false) until Jeanine approves them in
-- the admin. One review per booking; the cron mails the request
-- once per booking.
-- ============================================================

alter table reviews
  add column if not exists booking_id uuid
    references bookings(id) on delete set null;

create unique index if not exists reviews_booking_unique
  on reviews (booking_id) where (booking_id is not null);

alter table bookings
  add column if not exists review_request_sent_at timestamptz;
