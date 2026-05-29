-- ============================================================
-- 0001_init.sql — initial schema for Jeanine
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";
create extension if not exists "citext";

-- ----------------------------------------------------------------
-- Staff (v1: only Jeanine; prepared for multi-staff)
-- ----------------------------------------------------------------
create table staff (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid unique references auth.users(id) on delete set null,
  display_name  text not null,
  email         text not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- Services
-- ----------------------------------------------------------------
create type service_kind as enum ('regular', 'bridal');

create table services (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique not null,
  name               text not null,
  description        text,
  kind               service_kind not null default 'regular',
  duration_min       int  not null check (duration_min between 15 and 480),
  buffer_min         int  not null default 0,
  price_cents        int  not null check (price_cents >= 0),
  is_online_bookable boolean not null default true,
  is_active          boolean not null default true,
  sort_order         int  not null default 100,
  created_at         timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- Customers (built up via bookings, no login)
-- ----------------------------------------------------------------
create table customers (
  id          uuid primary key default gen_random_uuid(),
  email       citext not null unique,
  full_name   text not null,
  phone       text,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- Opening hours (recurring per weekday)
-- ----------------------------------------------------------------
create table opening_hours (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references staff(id) on delete cascade,
  weekday     int  not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time  time not null,
  end_time    time not null,
  check (end_time > start_time)
);

-- ----------------------------------------------------------------
-- Time off (vacation, sick, personal)
-- ----------------------------------------------------------------
create table time_off (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references staff(id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  reason      text,
  check (ends_at > starts_at)
);

-- ----------------------------------------------------------------
-- Bookings
-- ----------------------------------------------------------------
create type booking_status as enum (
  'pending', 'confirmed', 'cancelled', 'no_show', 'completed'
);

create table bookings (
  id              uuid primary key default gen_random_uuid(),
  staff_id        uuid not null references staff(id),
  service_id      uuid not null references services(id),
  customer_id     uuid not null references customers(id),
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  status          booking_status not null default 'confirmed',
  notes           text,
  idempotency_key uuid unique,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index bookings_staff_starts_idx on bookings(staff_id, starts_at);

alter table bookings
  add constraint bookings_no_overlap
  exclude using gist (
    staff_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pending', 'confirmed'));

-- ----------------------------------------------------------------
-- Bridal leads
-- ----------------------------------------------------------------
create type lead_status as enum ('new', 'contacted', 'quoted', 'won', 'lost');

create table bridal_leads (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null,
  email           citext not null,
  phone           text,
  wedding_date    date,
  location        text,
  party_size      int,
  services_wanted text[],
  budget_cents    int,
  message         text,
  status          lead_status not null default 'new',
  assigned_staff  uuid references staff(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- Audit log (lightweight)
-- ----------------------------------------------------------------
create table audit_log (
  id          bigserial primary key,
  actor       text,
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- updated_at triggers
-- ============================================================
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger bookings_set_updated_at
  before update on bookings
  for each row execute function set_updated_at();

create trigger bridal_leads_set_updated_at
  before update on bridal_leads
  for each row execute function set_updated_at();

-- ============================================================
-- RLS
-- ============================================================
alter table staff           enable row level security;
alter table services        enable row level security;
alter table customers       enable row level security;
alter table opening_hours   enable row level security;
alter table time_off        enable row level security;
alter table bookings        enable row level security;
alter table bridal_leads    enable row level security;
alter table audit_log       enable row level security;

-- Public reads: only active services + opening hours
create policy "public reads services"
  on services for select
  using (is_active = true);

create policy "public reads opening hours"
  on opening_hours for select
  using (true);

-- Staff (authenticated user listed in `staff`) has full access
create policy "staff full access services"
  on services for all
  using (auth.uid() in (select user_id from staff where is_active));

create policy "staff full access bookings"
  on bookings for all
  using (auth.uid() in (select user_id from staff where is_active));

create policy "staff full access leads"
  on bridal_leads for all
  using (auth.uid() in (select user_id from staff where is_active));

create policy "staff full access customers"
  on customers for all
  using (auth.uid() in (select user_id from staff where is_active));

create policy "staff full access opening hours"
  on opening_hours for all
  using (auth.uid() in (select user_id from staff where is_active));

create policy "staff full access time off"
  on time_off for all
  using (auth.uid() in (select user_id from staff where is_active));

create policy "staff full access staff"
  on staff for all
  using (auth.uid() in (select user_id from staff where is_active));

create policy "staff full access audit"
  on audit_log for all
  using (auth.uid() in (select user_id from staff where is_active));

-- Public writes happen via service_role from Server Actions, no anon policy needed.
