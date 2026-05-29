-- ============================================================
-- 0020_site_content.sql
-- Editable website text blocks (key -> value). Pages fall back to
-- their built-in defaults when a key has no row, so the site keeps
-- working before this migration is applied.
-- ============================================================

create table if not exists site_content (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz not null default now()
);

alter table site_content enable row level security;
-- Written via the service-role client (admin only); read server-side.
