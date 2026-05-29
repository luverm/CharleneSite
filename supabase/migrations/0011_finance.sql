-- ============================================================
-- 0011_finance.sql
-- BTW, betaalregistratie, bruidsaanbetaling en facturen.
-- ============================================================

-- BTW + factuurgegevens (0 = KOR / vrijgesteld)
alter table business_settings add column if not exists vat_rate int not null default 21;
alter table business_settings add column if not exists iban text;
alter table business_settings add column if not exists invoice_prefix text;

-- Betaalregistratie per boeking (geen online betaling — alleen vastleggen)
alter table bookings add column if not exists paid boolean not null default false;
alter table bookings add column if not exists paid_method text;       -- 'contant' | 'pin' | 'overboeking' | 'factuur'
alter table bookings add column if not exists paid_amount_cents int;
alter table bookings add column if not exists paid_at timestamptz;

-- Bruids-prijsafspraak + aanbetaling
alter table bridal_leads add column if not exists agreed_price_cents int;
alter table bridal_leads add column if not exists deposit_cents int;
alter table bridal_leads add column if not exists deposit_paid boolean not null default false;

-- Uitgegeven facturen (doorlopende nummering)
create table if not exists invoices (
  id              uuid primary key default gen_random_uuid(),
  number          text unique not null,
  booking_id      uuid references bookings(id) on delete set null,
  customer_name   text not null,
  customer_email  text,
  issued_on       date not null default current_date,
  description     text not null,
  subtotal_cents  int not null,
  vat_rate        int not null,
  vat_cents       int not null,
  total_cents     int not null,
  created_at      timestamptz not null default now()
);

alter table invoices enable row level security;
-- Read/write via the service-role client (admin) only.
