-- ============================================================
-- 0004_customer_no_show_ack.sql
-- Lets the admin dismiss the "frequent no-show" warning for a
-- customer. The warning reappears only if the no-show count rises
-- above the acknowledged value again.
-- ============================================================

alter table customers
  add column if not exists no_show_ack_count int not null default 0;
