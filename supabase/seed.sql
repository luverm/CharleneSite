-- ============================================================
-- seed.sql — local demo data
-- Idempotent: safe to run multiple times.
-- ============================================================

-- Single staff member (Charlène). user_id stays NULL until magic-link
-- login; link manually via SQL once auth user exists.
insert into staff (id, display_name, email, is_active)
values (
  '00000000-0000-0000-0000-000000000001',
  'Charlène',
  'charlene@example.com',
  true
)
on conflict (id) do nothing;

-- Services — mirrored from src/content/services.ts. Keep in sync.
insert into services (slug, name, description, kind, duration_min, buffer_min, price_cents, is_online_bookable, sort_order)
values
  ('knippen-dames',  'Dames knippen + stylen', NULL, 'regular', 60, 10, 3000, true, 110),
  ('knippen-heren',  'Heren knippen',          NULL, 'regular', 30, 10, 2000, true, 120),
  ('knippen-kids',   'Kinderen knippen',       NULL, 'regular', 30, 10, 1500, true, 130),
  ('pony-bijknippen','Pony bijknippen',        NULL, 'regular', 15, 5,  800,  true, 140)
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      kind = excluded.kind,
      duration_min = excluded.duration_min,
      buffer_min = excluded.buffer_min,
      price_cents = excluded.price_cents,
      is_online_bookable = excluded.is_online_bookable,
      sort_order = excluded.sort_order;

-- Opening hours (weekday: 0=Sun,1=Mon,...,6=Sat). Production hours are
-- managed in the admin (/instellingen/openingstijden); this only seeds
-- a fresh/local DB.
insert into opening_hours (staff_id, weekday, start_time, end_time)
select
  '00000000-0000-0000-0000-000000000001',
  v.weekday,
  v.start_time,
  v.end_time
from (values
  (2, time '09:00', time '17:00'),
  (3, time '09:00', time '17:00'),
  (4, time '09:00', time '20:00'),
  (5, time '09:00', time '17:00'),
  (6, time '09:00', time '15:00')
) as v(weekday, start_time, end_time)
where not exists (
  select 1 from opening_hours
  where staff_id = '00000000-0000-0000-0000-000000000001'
    and weekday = v.weekday
);
