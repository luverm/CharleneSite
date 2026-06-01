-- ============================================================
-- demo_seed.sql — Nederlandse demo-data voor Charlène
-- ============================================================
-- Vult de hele app met realistische demo-content: klanten, een
-- volle agenda (vorige/deze/volgende week), facturen, reviews,
-- notificaties, een chatgesprek, wachtlijst en e-maillog.
--
-- VEILIG VERWIJDERBAAR: elke demo-rij is gemarkeerd
--   * uuid-tabellen      → id begint met 'dddddddd-'
--   * facturen           → nummer begint met 'DEMO-'
--   * e-maillog          → context = 'demo'
-- Draai demo_teardown.sql om alles in één keer te wissen. De
-- basisconfig (staff, diensten, openingstijden, teksten) blijft staan.
--
-- Idempotent: eerst worden bestaande demo-rijen gewist, daarna opnieuw
-- ingevoegd. Datums zijn relatief (rond de huidige week), dus de agenda
-- ziet er altijd actueel uit. Draai dit in de Supabase SQL-editor.
-- ============================================================

begin;

-- ---- 0. Schone lei: verwijder eventuele eerdere demo-rijen ----
delete from invoices            where number like 'DEMO-%';
delete from bookings            where id::text like 'dddddddd-%';
delete from waitlist            where id::text like 'dddddddd-%';
delete from reviews             where id::text like 'dddddddd-%';
delete from admin_notifications where id::text like 'dddddddd-%';
delete from chat_messages       where thread_id::text like 'dddddddd-%';
delete from chat_threads        where id::text like 'dddddddd-%';
delete from email_log           where context = 'demo';
delete from customers           where id::text like 'dddddddd-%';

-- ---- 1. Klanten ----
insert into customers (id, email, full_name, phone, notes) values
  ('dddddddd-0000-4000-8000-000000000001', 'sanne.devries@demo.kapsalon.nl',  'Sanne de Vries',    '+31 6 1234 5601', 'Komt graag bij Charlène zelf.'),
  ('dddddddd-0000-4000-8000-000000000002', 'femke.bakker@demo.kapsalon.nl',   'Femke Bakker',      '+31 6 1234 5602', null),
  ('dddddddd-0000-4000-8000-000000000003', 'lotte.jansen@demo.kapsalon.nl',   'Lotte Jansen',      '+31 6 1234 5603', null),
  ('dddddddd-0000-4000-8000-000000000004', 'youssef.elamrani@demo.kapsalon.nl','Youssef El Amrani','+31 6 1234 5604', null),
  ('dddddddd-0000-4000-8000-000000000005', 'daan.visser@demo.kapsalon.nl',    'Daan Visser',       '+31 6 1234 5605', 'Allergisch voor bepaalde verf — zie notitie.'),
  ('dddddddd-0000-4000-8000-000000000006', 'eva.smit@demo.kapsalon.nl',       'Eva Smit',          '+31 6 1234 5606', null),
  ('dddddddd-0000-4000-8000-000000000007', 'noa.vandijk@demo.kapsalon.nl',    'Noa van Dijk',      '+31 6 1234 5607', null),
  ('dddddddd-0000-4000-8000-000000000008', 'sem.deboer@demo.kapsalon.nl',     'Sem de Boer',       '+31 6 1234 5608', null),
  ('dddddddd-0000-4000-8000-000000000009', 'julia.meijer@demo.kapsalon.nl',   'Julia Meijer',      '+31 6 1234 5609', null),
  ('dddddddd-0000-4000-8000-000000000010', 'tess.hendriks@demo.kapsalon.nl',  'Tess Hendriks',     '+31 6 1234 5610', null)
on conflict (id) do nothing;

-- ---- 2. Boekingen (agenda) ----
-- Verankerd aan de maandag van de huidige week (date_trunc 'week'),
-- zodat afspraken op open dagen (di–za) vallen. Status volgt de datum:
-- verleden = 'completed', toekomst = 'confirmed' (tenzij overschreven).
insert into bookings (id, staff_id, service_id, customer_id, starts_at, ends_at, status, notes)
select
  ('dddddddd-0001-4000-8000-' || lpad(v.seq::text, 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000001',
  s.id,
  ('dddddddd-0000-4000-8000-' || lpad(v.cust::text, 12, '0'))::uuid,
  t.starts_at,
  t.starts_at + make_interval(mins => s.duration_min),
  coalesce(
    v.status_override,
    case when (date_trunc('week', current_date)::date + v.dayoff) < current_date
         then 'completed' else 'confirmed' end
  )::booking_status,
  v.notes
from (
  values
    -- seq, dagoffset t.o.v. maandag, starttijd, dienst-slug, klant#, status-override, notitie
    ( 1, -6, time '09:30', 'knippen-heren',   5, null,        null),
    ( 2, -6, time '11:00', 'knippen-dames',   1, null,        null),
    ( 3, -5, time '14:00', 'knippen-kids',   10, null,        null),
    ( 4, -4, time '10:00', 'knippen-dames',   2, null,        null),
    ( 5, -4, time '16:30', 'pony-bijknippen', 7, 'no_show',   'Niet komen opdagen.'),
    ( 6, -2, time '10:30', 'knippen-heren',   8, null,        null),
    ( 7,  1, time '09:30', 'knippen-dames',   3, null,        null),
    ( 8,  1, time '13:00', 'knippen-heren',   4, null,        null),
    ( 9,  2, time '10:00', 'knippen-kids',    9, null,        null),
    (10,  2, time '11:30', 'knippen-dames',   6, null,        'Wil graag iets korter dan vorige keer.'),
    (11,  3, time '15:00', 'knippen-dames',   1, null,        null),
    (12,  3, time '18:00', 'knippen-heren',   5, null,        null),
    (13,  4, time '09:30', 'pony-bijknippen', 7, null,        null),
    (14,  4, time '10:30', 'knippen-dames',   2, null,        null),
    (15,  5, time '09:30', 'knippen-heren',   8, null,        null),
    (16,  5, time '11:00', 'knippen-kids',   10, null,        null),
    (17,  5, time '13:00', 'knippen-dames',   9, 'pending',   'Nog te bevestigen.'),
    (18,  8, time '10:00', 'knippen-dames',   3, null,        null),
    (19,  8, time '13:30', 'knippen-heren',   4, null,        null),
    (20,  9, time '11:00', 'knippen-dames',   6, null,        null),
    (21, 10, time '16:00', 'knippen-dames',   1, null,        null),
    (22, 11, time '09:30', 'knippen-kids',   10, 'pending',   'Nog te bevestigen.'),
    (23, 12, time '10:00', 'knippen-heren',   5, null,        null),
    (24, 12, time '12:00', 'knippen-dames',   2, null,        null),
    (25,  2, time '09:00', 'knippen-heren',   8, 'cancelled', 'Klant heeft zelf geannuleerd.')
) as v(seq, dayoff, st, slug, cust, status_override, notes)
join services s on s.slug = v.slug
cross join lateral (
  select ((date_trunc('week', current_date)::date + v.dayoff) + v.st)
         at time zone 'Europe/Amsterdam' as starts_at
) t
on conflict (id) do nothing;

-- ---- 3. Facturen ----
insert into invoices (id, number, booking_id, customer_name, customer_email, issued_on, description, subtotal_cents, vat_rate, vat_cents, total_cents) values
  ('dddddddd-0006-4000-8000-000000000001', 'DEMO-2026-001', 'dddddddd-0001-4000-8000-000000000002', 'Sanne de Vries', 'sanne.devries@demo.kapsalon.nl', date_trunc('week', current_date)::date - 6, 'Dames knippen + stylen', 2479, 21, 521, 3000),
  ('dddddddd-0006-4000-8000-000000000002', 'DEMO-2026-002', 'dddddddd-0001-4000-8000-000000000006', 'Sem de Boer',    'sem.deboer@demo.kapsalon.nl',    date_trunc('week', current_date)::date - 2, 'Heren knippen',          1653, 21, 347, 2000),
  ('dddddddd-0006-4000-8000-000000000003', 'DEMO-2026-003', 'dddddddd-0001-4000-8000-000000000004', 'Femke Bakker',   'femke.bakker@demo.kapsalon.nl',  date_trunc('week', current_date)::date - 4, 'Dames knippen + stylen', 2479, 21, 521, 3000),
  ('dddddddd-0006-4000-8000-000000000004', 'DEMO-2026-004', null,                                   'Eva Smit',       'eva.smit@demo.kapsalon.nl',      current_date - 10,                         'Verkoop verzorgingsproducten', 2062, 21, 433, 2495)
on conflict (id) do nothing;

-- ---- 4. Reviews (zichtbaar op de homepage) ----
insert into reviews (id, author, quote, sort_order, is_visible) values
  ('dddddddd-0002-4000-8000-000000000001', 'Anouk V.',  'Wat een fijne ervaring! Charlène denkt echt met je mee en het resultaat is precies wat ik wilde.', 10, true),
  ('dddddddd-0002-4000-8000-000000000002', 'Mark D.',   'Eindelijk een kapper die luistert. Mijn coupe zit al weken perfect.',                              20, true),
  ('dddddddd-0002-4000-8000-000000000003', 'Priya S.',  'Heerlijke sfeer en een prachtige kleuring. Ik kom hier zeker terug!',                              30, true),
  ('dddddddd-0002-4000-8000-000000000004', 'Esther K.', 'Altijd op tijd, vakkundig en gezellig. Een echte aanrader.',                                       40, true),
  ('dddddddd-0002-4000-8000-000000000005', 'Bram T.',   'Top service van begin tot eind. Mijn vrouw en ik komen hier allebei graag.',                       50, true)
on conflict (id) do nothing;

-- ---- 5. Admin-notificaties (live bel/badge) ----
insert into admin_notifications (id, kind, title, body, href, read_at, created_at) values
  ('dddddddd-0003-4000-8000-000000000001', 'booking',  'Nieuwe boeking — Dames knippen + stylen', 'Sanne de Vries heeft online geboekt voor volgende week.', '/agenda',                    null,                           now() - interval '18 minutes'),
  ('dddddddd-0003-4000-8000-000000000002', 'review',   'Nieuwe review (5 sterren)',               'Anouk V. heeft een review achtergelaten.',                '/instellingen/reviews',      null,                           now() - interval '2 hours'),
  ('dddddddd-0003-4000-8000-000000000003', 'waitlist', 'Nieuwe wachtlijst-aanmelding',            'Karin Postma wacht op een plek voor Heren knippen.',      '/instellingen/wachtlijst',   now() - interval '20 hours',    now() - interval '1 day')
on conflict (id) do nothing;

-- ---- 6. Chatgesprek (admin-inbox) ----
insert into chat_threads (id, visitor_name, keep, last_message_at, created_at) values
  ('dddddddd-0004-4000-8000-000000000001', 'Bezoeker (demo)', true, now() - interval '15 minutes', now() - interval '32 minutes')
on conflict (id) do nothing;

insert into chat_messages (thread_id, sender, body, created_at) values
  ('dddddddd-0004-4000-8000-000000000001', 'visitor', 'Hoi! Kan ik zaterdag nog terecht voor een kleuring?',                              now() - interval '30 minutes'),
  ('dddddddd-0004-4000-8000-000000000001', 'admin',   'Hallo! Zaterdag zit bijna vol, maar om 13:00 kan nog. Zal ik dat voor je reserveren?', now() - interval '25 minutes'),
  ('dddddddd-0004-4000-8000-000000000001', 'visitor', 'Ja graag, dat is perfect!',                                                        now() - interval '15 minutes');

-- ---- 7. Wachtlijst ----
insert into waitlist (id, service_id, preferred_date, full_name, email, phone, note, resolved)
select
  v.id::uuid,
  (select id from services where slug = v.slug),
  v.preferred_date,
  v.full_name, v.email, v.phone, v.note, false
from (
  values
    ('dddddddd-0005-4000-8000-000000000001', 'knippen-heren', current_date + 7,  'Karin Postma',  'karin.postma@demo.kapsalon.nl',  '+31 6 1234 5701', 'Liefst donderdagavond.'),
    ('dddddddd-0005-4000-8000-000000000002', 'knippen-dames', current_date + 10, 'Bram Willems',  'bram.willems@demo.kapsalon.nl',  '+31 6 1234 5702', null)
) as v(id, slug, preferred_date, full_name, email, phone, note)
on conflict (id) do nothing;

-- ---- 8. E-maillog ----
insert into email_log (to_email, subject, body, status, context, created_at) values
  ('sanne.devries@demo.kapsalon.nl', 'Bevestiging van je afspraak',        'Beste Sanne, je afspraak is bevestigd.', 'sent', 'demo', now() - interval '3 days'),
  ('femke.bakker@demo.kapsalon.nl',  'Herinnering: je afspraak morgen',    'Beste Femke, tot morgen!',               'sent', 'demo', now() - interval '1 day'),
  ('sem.deboer@demo.kapsalon.nl',    'Bevestiging van je afspraak',        'Beste Sem, je afspraak is bevestigd.',   'sent', 'demo', now() - interval '5 days');

commit;

-- Klaar. Controleer de agenda, /klanten, de homepage en de admin-bel.
