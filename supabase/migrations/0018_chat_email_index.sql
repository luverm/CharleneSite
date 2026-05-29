-- ============================================================
-- 0018_chat_email_index.sql
-- Lets a returning visitor find their conversation by email
-- (magic-link "login"). Idempotent.
-- ============================================================

create index if not exists chat_threads_email_idx
  on chat_threads (visitor_email)
  where (visitor_email is not null);
