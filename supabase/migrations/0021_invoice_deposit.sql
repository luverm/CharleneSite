-- ============================================================
-- 0021_invoice_deposit.sql
-- Records a deposit already received against an invoice, so the
-- printable invoice can show "reeds voldaan" and "nog te voldoen".
-- ============================================================

alter table invoices
  add column if not exists deposit_cents int not null default 0;
