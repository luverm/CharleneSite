-- ============================================================
-- 0013_rebooking_settings.sql
-- Instelbare cadans + aan/uit voor de "tijd voor een nieuwe
-- afspraak"-mail. Leeft in de bestaande single-row settings.
-- ============================================================

alter table business_settings
  add column if not exists rebooking_enabled boolean not null default true;
alter table business_settings
  add column if not exists rebooking_min_days int not null default 42;
alter table business_settings
  add column if not exists rebooking_max_days int not null default 120;
alter table business_settings
  add column if not exists rebooking_cooldown_days int not null default 60;
