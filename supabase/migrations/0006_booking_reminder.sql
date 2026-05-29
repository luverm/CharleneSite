-- ============================================================
-- 0006_booking_reminder.sql
-- Tracks whether the ~24h reminder mail was already sent so the
-- cron job is idempotent.
-- ============================================================

alter table bookings
  add column if not exists reminder_sent_at timestamptz;
