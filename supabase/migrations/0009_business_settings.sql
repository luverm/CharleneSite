-- ============================================================
-- 0009_business_settings.sql
-- Single-row table so the admin can edit business/contact details
-- without a code change. Code keeps src/content/business.ts as the
-- default; DB values override per field when present.
-- ============================================================

create table if not exists business_settings (
  id               int primary key default 1 check (id = 1),
  name             text,
  owner_name       text,
  tagline          text,
  email            text,
  phone            text,
  address_street   text,
  address_postcode text,
  address_city     text,
  kvk              text,
  btw              text,
  instagram        text,
  instagram_url    text,
  tiktok           text,
  updated_at       timestamptz not null default now()
);

insert into business_settings (id) values (1) on conflict (id) do nothing;

alter table business_settings enable row level security;
-- Read/write via the service-role client only.
