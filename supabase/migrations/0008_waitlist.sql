-- ============================================================
-- 0008_waitlist.sql
-- Captures demand when a day/slot is fully booked.
-- ============================================================

create table if not exists waitlist (
  id            uuid primary key default gen_random_uuid(),
  service_id    uuid references services(id) on delete set null,
  preferred_date date,
  full_name     text not null,
  email         citext not null,
  phone         text,
  note          text,
  resolved      boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists waitlist_open_idx
  on waitlist (created_at desc) where (resolved = false);

alter table waitlist enable row level security;
-- Public inserts go through the service-role client in a Server Action;
-- admin reads/writes also use service-role. No anon policy needed.
