-- ============================================================
-- 0016_chat.sql
-- Website chat: visitor <-> admin. Visitors are identified by an
-- unguessable public_token (no auth). Messages auto-purged after
-- 30 days unless the thread is marked `keep`. Image uploads live in
-- the private 'chat' Storage bucket. Service-role only (no anon RLS).
-- ============================================================

create table if not exists chat_threads (
  id                 uuid primary key default gen_random_uuid(),
  public_token       uuid not null unique default gen_random_uuid(),
  visitor_name       text,
  keep               boolean not null default false,
  last_message_at    timestamptz not null default now(),
  last_admin_read_at timestamptz,
  created_at         timestamptz not null default now()
);

create table if not exists chat_messages (
  id          bigserial primary key,
  thread_id   uuid not null references chat_threads(id) on delete cascade,
  sender      text not null check (sender in ('visitor', 'admin')),
  body        text not null default '',
  image_path  text,
  created_at  timestamptz not null default now()
);

create index if not exists chat_messages_thread_idx
  on chat_messages (thread_id, id);
create index if not exists chat_threads_recent_idx
  on chat_threads (last_message_at desc);

alter table chat_threads  enable row level security;
alter table chat_messages enable row level security;
-- No policies: anon has no access; the app reads/writes via the
-- service-role client (visitor access is gated by public_token).

insert into storage.buckets (id, name, public)
values ('chat', 'chat', false)
on conflict (id) do nothing;
