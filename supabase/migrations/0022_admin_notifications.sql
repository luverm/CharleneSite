-- ============================================================
-- 0022_admin_notifications.sql
-- In-app notificaties voor de admin (boekingen, annuleringen,
-- reviews). Vervangt de admin-notificatiemails.
-- ============================================================

create table if not exists admin_notifications (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null,
  title       text not null,
  body        text,
  href        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists admin_notifications_unread_idx
  on admin_notifications (created_at desc)
  where read_at is null;

alter table admin_notifications enable row level security;

create policy "staff manage admin notifications"
  on admin_notifications for all
  using (auth.uid() in (select user_id from staff where is_active));
