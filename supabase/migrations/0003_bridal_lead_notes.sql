-- ============================================================
-- 0003_bridal_lead_notes.sql
-- Internal admin notes on bridal leads (separate from the
-- customer-submitted `message`).
-- ============================================================

alter table bridal_leads
  add column if not exists notes text;
