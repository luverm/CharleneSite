-- ============================================================
-- 0017_chat_email.sql
-- Optional visitor email on a chat thread, so the customer can be
-- notified by mail when Jeanine replies. Idempotent.
-- ============================================================

alter table chat_threads
  add column if not exists visitor_email text;
