-- ============================================================
-- 0019_invoice_lines.sql
-- Line items for invoices (used by the bridal invoice maker).
-- Regular booking invoices keep working without lines (the
-- print page falls back to the single description row).
-- ============================================================

create table if not exists invoice_lines (
  id            uuid primary key default gen_random_uuid(),
  invoice_id    uuid not null references invoices(id) on delete cascade,
  description   text not null,
  quantity      numeric(10,2) not null default 1,
  unit_cents    int not null,
  amount_cents  int not null,
  sort          int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists invoice_lines_invoice_idx
  on invoice_lines (invoice_id, sort);

alter table invoice_lines enable row level security;
-- Read/write via the service-role client (admin) only — no policies,
-- same as the invoices table.
