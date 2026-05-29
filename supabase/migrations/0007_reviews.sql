-- ============================================================
-- 0007_reviews.sql
-- Admin-managed testimonials shown on the landing page.
-- ============================================================

create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  author      text not null,
  quote       text not null,
  sort_order  int  not null default 100,
  is_visible  boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table reviews enable row level security;

create policy "public reads visible reviews"
  on reviews for select
  using (is_visible = true);
-- Writes happen via the service-role client (admin), which bypasses RLS.
