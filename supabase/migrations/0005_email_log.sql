-- ============================================================
-- 0005_email_log.sql
-- Records every outbound mail attempt for admin visibility and
-- one-click resend.
-- ============================================================

create table if not exists email_log (
  id          bigserial primary key,
  to_email    text not null,
  subject     text not null,
  body        text not null default '',
  status      text not null,            -- 'sent' | 'failed' | 'skipped'
  error       text,
  context     text,                     -- e.g. 'booking_confirmation'
  created_at  timestamptz not null default now()
);

create index if not exists email_log_created_idx
  on email_log (created_at desc);

alter table email_log enable row level security;
-- No policy: anon has no access; the admin reads/writes via the
-- service-role client which bypasses RLS.
