-- ============================================================
-- 0012_rebooking_nudge.sql
-- Automatische "tijd voor een nieuwe afspraak"-mail: houdt bij
-- wanneer een klant voor het laatst is aangespoord en levert via
-- een SQL-functie de klanten die nu aan de beurt zijn.
-- ============================================================

alter table customers
  add column if not exists rebooking_nudge_sent_at timestamptz;

-- Klanten met een afgelopen reguliere afspraak tussen min_days en
-- max_days geleden, zonder toekomstige afspraak, die buiten de
-- cooldown vallen. Bruidsklanten doen niet mee (eenmalig, lead-flow).
create or replace function rebooking_candidates(
  min_days      int,
  max_days      int,
  cooldown_days int
)
returns table (
  customer_id  uuid,
  email        citext,
  full_name    text,
  last_service text,
  last_visit   timestamptz
)
language sql
stable
as $$
  with last_regular as (
    select distinct on (b.customer_id)
      b.customer_id,
      b.ends_at as last_visit,
      s.name    as last_service
    from bookings b
    join services s on s.id = b.service_id
    where b.status in ('confirmed', 'completed')
      and b.ends_at < now()
      and s.kind = 'regular'
    order by b.customer_id, b.ends_at desc
  ),
  has_future as (
    select distinct customer_id
    from bookings
    where status in ('pending', 'confirmed')
      and starts_at > now()
  )
  select
    c.id,
    c.email,
    c.full_name,
    lr.last_service,
    lr.last_visit
  from last_regular lr
  join customers c on c.id = lr.customer_id
  where lr.last_visit <= now() - make_interval(days => min_days)
    and lr.last_visit >= now() - make_interval(days => max_days)
    and lr.customer_id not in (select customer_id from has_future)
    and (
      c.rebooking_nudge_sent_at is null
      or c.rebooking_nudge_sent_at < now() - make_interval(days => cooldown_days)
    );
$$;
