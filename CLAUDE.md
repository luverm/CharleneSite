# Jeanine — Project Brief voor Claude Code

> Dit bestand is de complete context voor Claude Code. Plaats het in de root van het project. Claude Code leest `CLAUDE.md` automatisch bij elke sessie.

---

## 1. Project context

**Wat:** Boekings- en website-platform voor Jeanine, een zelfstandig kapper / bruidsstyliste.

**Twee soorten klanten:**
- **Reguliere klanten** — boeken zelf online (knippen, kleuren, föhnen).
- **Bruidsklanten** — premium niche met meer wrijving (proefsessies, op locatie, pakketten). Boeken **niet** direct online; vullen contactformulier in voor consult.

**Eén beheerder:** Jeanine zelf. Geen rollen of teams (schema is wel voorbereid op multi-medewerker, zodat uitbreiding later geen migratie-pijn geeft).

**Doelen:**
1. Klanten kunnen 24/7 reguliere afspraken inplannen zonder telefoon/WhatsApp heen-en-weer.
2. Bruidsleads komen via gestructureerd formulier binnen, niet via DM's.
3. Jeanine heeft één admin-dashboard met agenda, klanten, leads en diensten.
4. Geen dubbel-boekingen, geen vergeten leads.

**Niet-doelen (v1):**
- Geen online betalingen (komt eventueel later).
- Geen klantaccounts/login voor reguliere klanten — boeken via e-mailverificatie.
- Geen multi-locatie.
- Geen native mobile app.

---

## 2. Tech stack

| Laag | Keuze | Reden |
|---|---|---|
| Framework | **Next.js 16** (App Router, Server Components) | SSR voor SEO van publieke pagina's; server actions voor formulieren. |
| Taal | **TypeScript** (strict) | Typeveiligheid op DB-modellen en formulieren. |
| Database | **Supabase Postgres** | Relationeel schema past bij agenda/klanten; RLS voor admin-only routes. |
| Auth | **Supabase Auth** (alleen admin) | Magic link voor Jeanine; geen wachtwoord-beheer nodig. |
| Storage | **Supabase Storage** | Portfolio-afbeeldingen, bruidsmoodboards. |
| UI | **shadcn/ui** + **Tailwind CSS** | Snel componenten, volledig aanpasbaar, geen vendor lock-in. |
| Forms | **react-hook-form** + **zod** | Schema-gedreven validatie, zelfde zod-schema's op server. |
| Datum/tijd | **date-fns** + **date-fns-tz** | Lichter dan Luxon, goede tz-support voor `Europe/Amsterdam`. |
| E-mail | **Resend** | Bevestigingen klant + notificaties Jeanine. |
| Hosting | **Vercel** | Native Next.js, edge runtime voor publieke pagina's. |
| Analytics | **Vercel Analytics** + **Plausible** (optioneel) | Privacy-vriendelijk. |

**Versies (geïnstalleerd in Fase 1):**
- `next@16.x`, `react@19.x`, `typescript@5.x`
- `@supabase/supabase-js@2.x`, `@supabase/ssr@0.10.x`
- `tailwindcss@4.x`, `zod@4.x`, `react-hook-form@7.x`

---

## 3. Architectuurkeuzes

### 3.1 App Router structuur
- **`(public)`** route group — landingspagina, diensten, portfolio, boeken, bruid-contact.
- **`(admin)`** route group — beschermd door middleware, alle admin-pagina's.
- **`api/`** alleen voor webhooks (Resend, ICS-feed). Mutaties gaan via **Server Actions**.

### 3.2 Data-toegang
- **Twee Supabase clients:**
  - `createBrowserClient()` — voor client components (alleen lezen publieke data).
  - `createServerClient()` — voor server components/actions, met cookies.
- **Service role key** (server-only) voor mutaties die RLS moeten omzeilen, bv. anonieme boekingen.
- Alle queries in `src/lib/db/*.ts`, getypeerd via `Database` type uit Supabase CLI.

### 3.3 Beveiligde routes
- `middleware.ts` controleert sessie voor `(admin)` routes, redirect naar `/login`.
- RLS-policies op alle tabellen: alleen `service_role` of geauthenticeerde admin mag schrijven; publieke reads alleen waar nodig (diensten, openingstijden).

### 3.4 Validatie
- Eén `zod` schema per entiteit in `src/lib/schemas/`.
- Form gebruikt schema client-side; Server Action parsed hetzelfde schema server-side.
- Geen vertrouwen op client-side validatie — server is autoriteit.

### 3.5 Tijdzones
- DB slaat alles op als `timestamptz` in UTC.
- UI rendert in `Europe/Amsterdam`.
- Conversie altijd via één util (`src/lib/time.ts`); nooit `new Date()` op rauwe DB-velden in components.

### 3.6 Idempotentie & race conditions
- Boekingen krijgen een `idempotency_key` (UUID gegenereerd client-side).
- Slot-claim gebruikt **`SELECT ... FOR UPDATE`** binnen transactie (zie §7).

---

## 4. File structuur

```
.
├── CLAUDE.md                         # dit bestand
├── README.md                         # dev setup
├── .env.local.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── middleware.ts                     # admin auth gate
├── supabase/
│   ├── migrations/                   # SQL migraties (zie §5)
│   ├── seed.sql                      # demo-data voor lokaal
│   └── config.toml
├── public/
│   ├── images/portfolio/             # statische portfolio
│   └── favicon.ico
└── src/
    ├── app/
    │   ├── (public)/
    │   │   ├── layout.tsx            # publieke nav + footer
    │   │   ├── page.tsx              # landing (K1)
    │   │   ├── diensten/page.tsx
    │   │   ├── portfolio/page.tsx
    │   │   ├── boeken/
    │   │   │   ├── page.tsx          # K2 — kies dienst + tijd
    │   │   │   └── bevestigd/page.tsx
    │   │   ├── bruid/
    │   │   │   ├── page.tsx          # bruid landing
    │   │   │   └── contact/page.tsx  # K3 — leadformulier
    │   │   └── bedankt/page.tsx
    │   ├── (admin)/
    │   │   ├── layout.tsx            # admin shell + sidebar
    │   │   ├── login/page.tsx        # magic link
    │   │   ├── dashboard/page.tsx    # A1 — agenda + KPI's
    │   │   ├── boekingen/page.tsx    # A2 — lijst, filter, detail
    │   │   ├── boekingen/[id]/page.tsx
    │   │   ├── leads/page.tsx        # A3 — bruidsleads
    │   │   ├── leads/[id]/page.tsx
    │   │   ├── klanten/page.tsx
    │   │   └── instellingen/
    │   │       ├── page.tsx          # bedrijf, contact
    │   │       ├── diensten/page.tsx # CRUD op services (admin)
    │   │       ├── openingstijden/page.tsx
    │   │       └── vrije-dagen/page.tsx
    │   ├── api/
    │   │   ├── ics/route.ts          # iCal feed voor Jeanine
    │   │   └── webhooks/resend/route.ts
    │   └── layout.tsx                # root, fonts, theme
    ├── components/
    │   ├── ui/                       # shadcn componenten
    │   ├── public/                   # hero, dienstkaart, gallery
    │   ├── booking/                  # date-picker, slot-grid
    │   └── admin/                    # agenda-view, lead-card
    ├── lib/
    │   ├── supabase/
    │   │   ├── browser.ts
    │   │   ├── server.ts
    │   │   └── service.ts            # service role
    │   ├── db/
    │   │   ├── types.ts              # gegenereerd door supabase gen types
    │   │   ├── bookings.ts
    │   │   ├── services.ts
    │   │   ├── leads.ts
    │   │   ├── customers.ts
    │   │   └── availability.ts       # algoritme uit §7
    │   ├── schemas/
    │   │   ├── booking.ts
    │   │   ├── lead.ts
    │   │   └── service.ts
    │   ├── email/
    │   │   ├── client.ts             # Resend wrapper
    │   │   └── templates/
    │   │       ├── booking-confirmation.tsx
    │   │       ├── booking-admin-notify.tsx
    │   │       └── lead-admin-notify.tsx
    │   ├── time.ts                   # tz-utils
    │   └── env.ts                    # zod-gevalideerde env
    └── actions/
        ├── booking.ts                # createBooking, cancelBooking
        ├── lead.ts                   # createLead, updateLeadStatus
        ├── service.ts
        └── settings.ts
```

**Regels:**
- Geen business-logica in components — altijd in `lib/db/*` of `actions/*`.
- Server Actions exporteren één named export per actie (geen default).
- Elk schema in `lib/schemas/` is single source of truth voor form + server.

---

## 5. Database schema

Eén initiële migratie: `supabase/migrations/0001_init.sql`. Schema is voorbereid op multi-medewerker (kolom `staff_id`) maar in v1 vullen we altijd de enige Jeanine-staff in.

```sql
-- ============================================================
-- 0001_init.sql
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- ----------------------------------------------------------------
-- Staff (v1: alleen Jeanine; voorbereid op uitbreiding)
-- ----------------------------------------------------------------
create table staff (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid unique references auth.users(id) on delete set null,
  display_name  text not null,
  email         text not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- Diensten (services) — reguliere diensten zijn online boekbaar
-- ----------------------------------------------------------------
create type service_kind as enum ('regular', 'bridal');

create table services (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  description     text,
  kind            service_kind not null default 'regular',
  duration_min    int  not null check (duration_min between 15 and 480),
  buffer_min      int  not null default 0,
  price_cents     int  not null check (price_cents >= 0),
  is_online_bookable boolean not null default true,
  is_active       boolean not null default true,
  sort_order      int  not null default 100,
  created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- Klanten — opgebouwd via boekingen, geen login
-- ----------------------------------------------------------------
create table customers (
  id          uuid primary key default gen_random_uuid(),
  email       citext not null,
  full_name   text not null,
  phone       text,
  notes       text,
  created_at  timestamptz not null default now(),
  unique (email)
);
create extension if not exists citext;

-- ----------------------------------------------------------------
-- Openingstijden — recurring per weekday
-- ----------------------------------------------------------------
create table opening_hours (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references staff(id) on delete cascade,
  weekday     int  not null check (weekday between 0 and 6), -- 0 = zondag
  start_time  time not null,
  end_time    time not null,
  check (end_time > start_time)
);

-- ----------------------------------------------------------------
-- Vrije dagen / blokkades (vakantie, ziek, prive)
-- ----------------------------------------------------------------
create table time_off (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references staff(id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  reason      text,
  check (ends_at > starts_at)
);

-- ----------------------------------------------------------------
-- Boekingen
-- ----------------------------------------------------------------
create type booking_status as enum ('pending', 'confirmed', 'cancelled', 'no_show', 'completed');

create table bookings (
  id              uuid primary key default gen_random_uuid(),
  staff_id        uuid not null references staff(id),
  service_id      uuid not null references services(id),
  customer_id     uuid not null references customers(id),
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  status          booking_status not null default 'confirmed',
  notes           text,
  idempotency_key uuid unique,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- Voorkom overlappende actieve boekingen per medewerker
create index bookings_staff_starts_idx on bookings(staff_id, starts_at);

alter table bookings
  add constraint bookings_no_overlap
  exclude using gist (
    staff_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pending', 'confirmed'));

-- ----------------------------------------------------------------
-- Bruidsleads — niet direct boekbaar
-- ----------------------------------------------------------------
create type lead_status as enum ('new', 'contacted', 'quoted', 'won', 'lost');

create table bridal_leads (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null,
  email           citext not null,
  phone           text,
  wedding_date    date,
  location        text,
  party_size      int,
  services_wanted text[],
  budget_cents    int,
  message         text,
  status          lead_status not null default 'new',
  assigned_staff  uuid references staff(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- Audit log (lichte versie)
-- ----------------------------------------------------------------
create table audit_log (
  id          bigserial primary key,
  actor       text,                 -- 'admin:<email>' of 'public'
  action      text not null,        -- 'booking.create' etc.
  entity      text not null,
  entity_id   uuid,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- RLS
-- ============================================================
alter table staff           enable row level security;
alter table services        enable row level security;
alter table customers       enable row level security;
alter table opening_hours   enable row level security;
alter table time_off        enable row level security;
alter table bookings        enable row level security;
alter table bridal_leads    enable row level security;
alter table audit_log       enable row level security;

-- Publieke reads: alleen actieve diensten en openingstijden
create policy "public reads services"
  on services for select
  using (is_active = true);

create policy "public reads opening hours"
  on opening_hours for select
  using (true);

-- Admin (geauthenticeerde user die in staff staat) mag alles
create policy "staff full access services"
  on services for all
  using (auth.uid() in (select user_id from staff where is_active));

create policy "staff full access bookings"
  on bookings for all
  using (auth.uid() in (select user_id from staff where is_active));

create policy "staff full access leads"
  on bridal_leads for all
  using (auth.uid() in (select user_id from staff where is_active));

create policy "staff full access customers"
  on customers for all
  using (auth.uid() in (select user_id from staff where is_active));

-- Schrijven door publiek gebeurt via service_role in Server Actions,
-- dus geen INSERT-policy voor anon nodig.
```

**Indexen om later toe te voegen** als data groeit:
- `bridal_leads(status, created_at desc)` — admin lijst.
- `bookings(starts_at) where status in ('pending','confirmed')` — agenda-view.

**Migratie-strategie:** elke wijziging = nieuwe genummerde file (`0002_*.sql`). Nooit oude migraties bewerken.

---

## 6. Pagina specs

Wireframe-codes: **K1–K3** = klant-pagina's, **A1–A3** = admin-pagina's. Andere pagina's zijn ondersteunend.

### K1 — Landingspagina (`/`)
**Doel:** bezoeker binnen 5 seconden laten zien wie Jeanine is en twee duidelijke CTA's: "Boek afspraak" en "Bruid? Plan consult".

**Secties (top → bottom):**
1. **Hero** — fullscreen foto, naam, één-zin propositie, twee CTA's (`/boeken`, `/bruid`).
2. **Diensten preview** — 3 kaarten (knippen, kleuren, bruid). Alleen actieve diensten met `kind='regular'` + één bruid-teaser.
3. **Portfolio strip** — 6 portfolio-foto's, link naar `/portfolio`.
4. **Over Jeanine** — kort, persoonlijk, foto.
5. **Reviews** — 3 quotes (statisch in v1).
6. **Footer** — adres, openingstijden, social, KvK/BTW.

**Data:** `services` (kind in regular/bridal, is_active=true), statische content uit `src/content/landing.ts`.
**Render:** Server Component, ISR (`revalidate: 3600`).

### K2 — Boeken (`/boeken`)
**Doel:** anonieme klant boekt regulier in 4 stappen.

**Stappen (één pagina, stepper):**
1. **Kies dienst** — dienstkaarten, tonen duur en prijs. Alleen `kind='regular'` en `is_online_bookable=true`.
2. **Kies datum** — kalender, gedisableerde dagen op basis van openingstijden + `time_off`.
3. **Kies tijd** — slot-grid voor gekozen dag (zie §7).
4. **Gegevens** — naam, e-mail, telefoon, optionele opmerking.

**Submit:**
- Server Action `createBooking` (idempotent met UUID uit form).
- Bij succes → `/boeken/bevestigd?ref=<id>`.
- Bij race-conflict → toast "Slot net weg, kies opnieuw" + scroll naar stap 3.

**E-mail:** klant krijgt bevestiging + ICS-bijlage. Jeanine krijgt notificatie.

### K3 — Bruidscontact (`/bruid/contact`)
**Doel:** kwalificeerde lead voor bruidsstyling. Geen beschikbaarheid tonen — Jeanine plant zelf in.

**Velden (alle behalve message verplicht):**
- Volledige naam, e-mail, telefoon
- Trouwdatum (date picker, ≥ vandaag)
- Locatie (stad + postcode)
- Aantal personen (jij + bruidsmeisjes etc.)
- Gewenste diensten (multi-select: bruid, proefsessie, bruidsmeisjes, moeder bruid, hairextensions)
- Budget indicatie (range slider, optioneel)
- Vrij bericht (textarea)
- Honeypot veld + Turnstile (zie §11)

**Submit → Server Action `createLead`:**
- Insert in `bridal_leads` met `status='new'`.
- E-mail naar Jeanine met alle velden.
- E-mail naar klant: "We nemen binnen 2 werkdagen contact op".
- Redirect → `/bedankt`.

### A1 — Admin Dashboard (`/dashboard`)
**Doel:** in één blik zien wat vandaag/deze week speelt.

**Secties:**
1. **KPI-strip:** vandaag aantal afspraken, week-omzet, openstaande leads, no-shows laatste 30 dagen.
2. **Agenda vandaag/morgen** — tijdslijn met blokken (klik → detail).
3. **Nieuwe leads** — laatste 5 met `status='new'`, knop "Bekijk".
4. **Snelle acties** — "Nieuwe boeking handmatig", "Dag blokkeren".

**Data:** server component, alle queries parallel via `Promise.all`.

### A2 — Boekingen (`/boekingen`)
**Doel:** alle boekingen beheren.

**Layout:**
- **Filters bovenin:** datum-range, status, dienst, zoek op naam/e-mail.
- **Lijst:** tabel of kalender-toggle.
- **Detail (`/boekingen/[id]`):** klantgegevens, dienst, tijd, status, notities. Acties: status wijzigen, verzetten, annuleren (stuurt klant e-mail), notitie toevoegen.

**Mutaties:** Server Actions `updateBookingStatus`, `rescheduleBooking`, `cancelBooking`. Elk schrijft audit-log.

### A3 — Leads (`/leads`)
**Doel:** bruidspijplijn beheren.

**Layout:**
- **Kanban-bord** met kolommen: New → Contacted → Quoted → Won / Lost.
- **Kaart:** naam, trouwdatum, locatie, aantal personen.
- **Detail (`/leads/[id]`):** alle formuliervelden, status-dropdown, interne notities, knop "Maak boeking" (pre-fill bruidsdienst).

**Mutaties:** `updateLeadStatus`, `addLeadNote`. Drag-drop op kanban triggert status-update met optimistic UI.

### Ondersteunende admin-pagina's
- `/klanten` — zoekbare lijst, samengevoegd op e-mail.
- `/instellingen` — bedrijfsgegevens, e-mailtemplates.
- `/instellingen/diensten` — CRUD op `services` (admin; `/diensten` is voor klanten).
- `/instellingen/openingstijden` — werktijden per weekdag.
- `/instellingen/vrije-dagen` — vakantie / blokkades.

---

## 7. Availability algoritme & race conditions

### 7.1 Slot-berekening (`getAvailableSlots`)

**Input:** `staffId`, `serviceId`, `date` (YYYY-MM-DD in `Europe/Amsterdam`).
**Output:** array van `{ startsAt, endsAt }` in UTC.

**Algoritme:**
```
1. Haal service op → duration_min, buffer_min.
2. Haal opening_hours voor die weekday op → reeks van [open, close] tijden.
3. Haal time_off in een 48u-venster rond die dag op.
4. Haal bookings in datzelfde venster op (status in pending,confirmed).
5. Bouw "occupied" intervallen:
     occupied = bookings ∪ time_off
     elke booking wordt verlengd met buffer_min aan beide kanten.
6. Voor elk [open,close]-blok:
     stap = bv. 15 min (configureerbaar in services)
     for t = open; t + duration_min ≤ close; t += stap:
       candidate = [t, t + duration_min]
       if candidate niet overlapt met occupied:
         push candidate
7. Filter: candidate.startsAt > now + minLeadTime (bv. 2 uur).
8. Return.
```

**Belangrijk:**
- **Stap-grootte** is per dienst configureerbaar (default 15 min). Voorkomt slot-explosie.
- **min-lead-time** van 2 uur in v1 (geen last-minute spoedboekingen).
- **Max-vooruit** van 90 dagen — beschikbaarheid daarna gewoon "geen slots" tonen.
- Alle berekening server-side; client krijgt alleen finale lijst.

### 7.2 Race condition bij dubbel-boeken

Twee klanten kunnen exact gelijktijdig hetzelfde slot zien en submitten. Aanpak:

**Database-laag (waterdicht):**
De `bookings_no_overlap` GIST-exclusion-constraint uit §5 garandeert dat **geen twee** boekingen voor dezelfde `staff_id` overlappende `tstzrange` hebben terwijl ze `pending` of `confirmed` zijn. Insert van een conflict faalt met `23P01` (`exclusion_violation`).

**Server Action-laag (`createBooking`):**
```ts
// pseudo-code
async function createBooking(input) {
  const parsed = bookingSchema.parse(input);

  // 1. Idempotency: bestaat er al een boeking met deze key?
  const existing = await db.bookings.findByIdempotencyKey(parsed.idempotencyKey);
  if (existing) return { ok: true, bookingId: existing.id };

  // 2. Upsert customer (uniek op email).
  const customer = await db.customers.upsertByEmail(parsed.customer);

  // 3. Insert booking — laat de DB-constraint racen.
  try {
    const booking = await db.bookings.insert({
      staff_id: parsed.staffId,
      service_id: parsed.serviceId,
      customer_id: customer.id,
      starts_at: parsed.startsAt,
      ends_at: parsed.endsAt,
      status: 'confirmed',
      idempotency_key: parsed.idempotencyKey,
    });
    await sendConfirmationEmails(booking);
    await audit('booking.create', booking.id, parsed);
    return { ok: true, bookingId: booking.id };
  } catch (err) {
    if (isExclusionViolation(err)) {
      return { ok: false, code: 'SLOT_TAKEN' };
    }
    throw err;
  }
}
```

**Voordelen van deze aanpak:**
- Geen handmatige `SELECT ... FOR UPDATE` nodig — de exclusion constraint is atomair.
- Idempotency-key zorgt dat retry's na netwerkhick niets kapotmaken.
- Bij `SLOT_TAKEN` doet de UI een refresh van slots en toont vriendelijke melding.

### 7.3 Buffer & opruimen

- **Buffer** zit in slot-berekening, niet in de boekingsrange zelf. De DB-constraint kijkt alleen naar feitelijke afspraaktijd.
- **Pending-boekingen** zijn er in v1 niet (we slaan direct als `confirmed` op). De `pending` status is voorbehouden voor toekomstige flow met betaling/aanbetaling.
- **Cancellations** zetten `status='cancelled'` — daarmee valt de rij buiten de exclusion-constraint en komt het slot vrij.

### 7.4 Tests die altijd moeten draaien
1. `getAvailableSlots` respecteert openingstijden, time_off, bestaande bookings, buffer.
2. Twee parallelle `createBooking` calls op hetzelfde slot — exact één slaagt.
3. Retry van `createBooking` met dezelfde idempotency-key — geen dubbele rij.
4. Cancelled boeking maakt slot weer beschikbaar.
5. DST-overgang (laatste zondag maart/oktober) — slots zijn correct in lokale tijd.

---

## 8. Placeholders / variabelen

Vervang deze waarden later met Jeanine's echte gegevens. Tot die tijd staan ze als constants in `src/content/business.ts` zodat één plek de bron is.

```ts
// src/content/business.ts
export const business = {
  name:        "{{BEDRIJFSNAAM}}",            // bv. "Studio Jeanine"
  ownerName:   "{{VOORNAAM}} {{ACHTERNAAM}}", // "Jeanine ..."
  tagline:     "{{TAGLINE}}",                 // 1 zin propositie
  email:       "{{ZAKELIJK_EMAIL}}",
  phone:       "{{TELEFOON}}",                // E.164 formaat
  whatsapp:    "{{WHATSAPP_LINK}}",
  address: {
    street:    "{{STRAAT_HUISNR}}",
    postcode:  "{{POSTCODE}}",
    city:      "{{STAD}}",
  },
  kvk:         "{{KVK_NUMMER}}",
  btw:         "{{BTW_NUMMER}}",
  iban:        "{{IBAN}}",                    // alleen voor facturen later
  socials: {
    instagram: "{{INSTAGRAM_HANDLE}}",
    tiktok:    "{{TIKTOK_HANDLE}}",
  },
  brand: {
    primaryHex:   "{{PRIMARY_KLEUR}}",        // bv. #2A2A2A
    accentHex:    "{{ACCENT_KLEUR}}",
    fontDisplay:  "{{HEADING_FONT}}",         // bv. "Cormorant Garamond"
    fontBody:     "{{BODY_FONT}}",            // bv. "Inter"
  },
};
```

**Env-variabelen** (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only
RESEND_API_KEY=
RESEND_FROM_EMAIL=                # bv. afspraak@studiojeanine.nl
ADMIN_NOTIFY_EMAIL=               # waar Jeanine notificaties krijgt
NEXT_PUBLIC_SITE_URL=             # https://...
TURNSTILE_SITE_KEY=               # Cloudflare Turnstile (publiek)
TURNSTILE_SECRET_KEY=             # server
```

`src/lib/env.ts` valideert deze met zod bij boot — server crasht hard als iets ontbreekt.

---

## 9. Roadmap (5 fases)

Elke fase is één Claude Code-sessie, eindigt met werkende, gecommitte code.

| Fase | Doel | Output |
|---|---|---|
| **1. Skelet** | Project bootstrap, Supabase, schema, env, layout. | Lokaal draaiend, lege pagina's, DB met seed. |
| **2. Publieke kant** | K1 landing, diensten, portfolio, statisch. | Site er presentabel uit, geen forms. |
| **3. Boekingsflow** | K2 + availability + Server Actions + e-mails. | Klant kan reguliere afspraak boeken. |
| **4. Bruidsleads** | K3 + lead-capture + admin notificatie. | Bruidsleads landen in DB en mailbox. |
| **5. Admin** | A1 dashboard, A2 boekingen, A3 leads, instellingen. | Jeanine kan haar zaak beheren. |

**Na fase 5** (later, niet in v1):
- Online aanbetaling via Mollie.
- SMS-reminders 24u vooraf.
- Klantportaal met magic link voor herboeken.
- Multi-staff.

---

## 10. Claude Code prompts per fase

Plak één prompt per sessie. Elke prompt verwijst naar deze CLAUDE.md voor details.

### Fase 1 — Skelet

```
Lees CLAUDE.md volledig. Bouw nu Fase 1 (Skelet):

1. Initialiseer Next.js 15 met App Router, TypeScript strict, Tailwind, ESLint.
2. Installeer dependencies: @supabase/supabase-js, @supabase/ssr, zod,
   react-hook-form, @hookform/resolvers, date-fns, date-fns-tz, resend,
   class-variance-authority, lucide-react.
3. Voeg shadcn/ui toe (init met New York style, slate base color) en
   installeer button, input, label, card, calendar, dialog, dropdown-menu,
   table, toast, tabs, select, textarea, badge.
4. Maak de file-structuur uit §4 aan (lege placeholder-pagina's volstaan
   waar nog geen specs zijn).
5. Implementeer src/lib/env.ts met zod-validatie van alle env vars uit §8.
6. Implementeer src/lib/supabase/{browser,server,service}.ts.
7. Schrijf supabase/migrations/0001_init.sql exact zoals in §5.
8. Schrijf supabase/seed.sql met: 1 staff (Jeanine, dummy email), 5 services
   (knippen, kleuren, föhnen, bruid-proefsessie, bruid-styling),
   openingstijden ma–za 09:00–17:00.
9. Implementeer middleware.ts dat /dashboard, /boekingen, /leads, /klanten,
   /instellingen redirect naar /login zonder sessie.
10. Schrijf README.md met setup-stappen (env, supabase start, migrate,
    seed, dev).

Stop na fase 1. Laat me lokaal verifiëren voordat we naar fase 2 gaan.
Commit met conventional commit-stijl.
```

### Fase 2 — Publieke kant

```
Lees CLAUDE.md. Bouw nu Fase 2 (Publieke kant):

1. Maak src/content/business.ts met de placeholders uit §8 (laat de
   {{...}} waarden staan, ik vul ze later in).
2. Bouw landingspagina (K1, /) volgens §6: hero, diensten preview (haalt
   actieve services uit DB), portfolio strip (statisch uit /public),
   over-blok, reviews (statisch), footer.
3. Bouw /diensten pagina: alle actieve services in lijst, gegroepeerd per
   kind (regular vs bridal).
4. Bouw /portfolio pagina: grid van afbeeldingen uit /public/images/portfolio.
5. Bouw /bruid landing: aparte pagina, bruidsdiensten + grote CTA naar
   /bruid/contact.
6. Maak responsive nav (mobile drawer) en footer in (public)/layout.tsx.
7. SEO: metadata per pagina, sitemap.ts, robots.ts, og-image generator
   via next/og.
8. ISR (revalidate: 3600) op alle publieke pagina's.

Geen forms in deze fase. Commit aan het eind.
```

### Fase 3 — Boekingsflow

```
Lees CLAUDE.md, in het bijzonder §6 (K2) en §7 (algoritme).
Bouw nu Fase 3 (Boekingsflow):

1. src/lib/schemas/booking.ts — zod-schema voor formulier en server.
2. src/lib/db/availability.ts — implementeer getAvailableSlots exact volgens §7.1.
3. src/lib/db/bookings.ts — insert + idempotency-lookup + cancel.
4. src/lib/email/templates/booking-confirmation.tsx en booking-admin-notify.tsx.
5. src/lib/email/client.ts — Resend wrapper.
6. src/actions/booking.ts — createBooking exact volgens §7.2 pseudo-code,
   inclusief catch op exclusion-violation en idempotency-check.
7. UI op /boeken (K2): 4 stappen-stepper, slot-grid component, react-hook-form
   met zod, toast bij errors. Idempotency-key UUID gegenereerd in form
   useEffect (één keer per mount).
8. /boeken/bevestigd: detail van boeking via ref query-param.
9. Tests (Vitest):
   - getAvailableSlots: 4 cases (normaal, time_off, bestaande booking, DST).
   - createBooking idempotency: 2x zelfde key = 1 rij.
   - createBooking race: 2 parallelle calls = 1 succes + 1 SLOT_TAKEN.

Commit aan het eind. Stop voor fase 4.
```

### Fase 4 — Bruidsleads

```
Lees CLAUDE.md, §6 (K3). Bouw Fase 4 (Bruidsleads):

1. src/lib/schemas/lead.ts — zod-schema met alle velden uit K3.
2. src/lib/db/leads.ts — insert, list, updateStatus.
3. src/lib/email/templates/lead-admin-notify.tsx.
4. src/actions/lead.ts — createLead met:
   - Honeypot-check (verborgen veld 'website' moet leeg zijn).
   - Cloudflare Turnstile verify (server-side).
   - Rate-limit (max 3 per IP per uur, gebruik Upstash Ratelimit als simpel
     in-memory niet betrouwbaar genoeg is — voor v1 mag in-memory).
5. UI op /bruid/contact: formulier met react-hook-form, alle velden uit §6 K3,
   Turnstile widget, honeypot.
6. /bedankt pagina met warme tekst.

Commit aan het eind.
```

### Fase 5 — Admin

```
Lees CLAUDE.md, §6 (A1, A2, A3). Bouw Fase 5 (Admin):

1. /login: magic-link form met Supabase Auth, redirect terug naar /dashboard.
2. (admin)/layout.tsx: sidebar nav, top-bar met logout, mobile-responsive.
3. /dashboard (A1): KPI-strip, vandaag-agenda, nieuwe leads, snelle acties.
   Alle queries parallel.
4. /boekingen (A2): tabel met filters (datum-range, status, dienst, zoek),
   kalender-toggle (gebruik FullCalendar of custom). Detail-pagina /boekingen/[id]
   met status-acties.
5. /leads (A3): kanban met @dnd-kit, kaarten klikbaar naar detail. Detail-pagina
   /leads/[id] met alle velden, status-dropdown, notes, "Maak boeking" knop
   die /boekingen/nieuw pre-fillt.
6. /klanten: zoekbare lijst.
7. /instellingen: bedrijfsgegevens, plus subpagina's:
   /instellingen/diensten (CRUD), /instellingen/openingstijden,
   /instellingen/vrije-dagen.
9. /api/ics/route.ts: lever iCal-feed van komende boekingen, beveiligd met
   token uit env.

Commit aan het eind. Stop. v1 is af.
```

---

## 11. Security & validatie

**Verplicht:**
- **RLS aan op alle tabellen** (zie §5). Zonder policy = geen toegang.
- **Service role key staat alleen op server** — nooit in client-bundle. Verifieer met `next build` dat `SUPABASE_SERVICE_ROLE_KEY` niet in `.next/static/` voorkomt.
- **Server Actions** valideren altijd opnieuw met zod, ook al deed de client het al.
- **Rate-limiting** op `createBooking` en `createLead` (3 / IP / minuut booking, 3 / IP / uur lead).
- **Cloudflare Turnstile** op K3 (lead-formulier) — bruidsleads zijn aantrekkelijk voor spam.
- **Honeypot-veld** `website` in beide publieke formulieren.
- **CSP-headers** via `next.config.ts`: `default-src 'self'`, sta Supabase, Resend, Vercel Analytics expliciet toe.
- **Email-injectie:** sanitize alle user input voor templates (geen rauwe HTML).
- **PII:** alleen e-mail, naam, telefoon. Geen DOB, geen adres voor reguliere klanten. Bruidsleads hebben locatie (stad+postcode), nooit huisnummer.
- **GDPR-export**: Server Action `/instellingen/klant-export` die JSON-dump per e-mail genereert. Verwijder-route die customer + bookings hard delete.
- **Audit-log** schrijven bij iedere admin-mutatie — wie, wat, wanneer.

**Niet doen:**
- Geen `dangerouslySetInnerHTML` op user input.
- Geen klantdata in URL query-params (gebruik form POST + redirect).
- Geen e-mailadres in publieke meta-tags (scrapers).

---

## 12. Deployment & environments

**Drie omgevingen:**

| Omgeving | URL | Branch | Supabase project |
|---|---|---|---|
| Local | `localhost:3000` | feature branches | lokale `supabase start` |
| Preview | Vercel preview | PR's | shared `jeanine-staging` |
| Productie | `studiojeanine.nl` | `main` | `jeanine-prod` |

**Vercel-config:**
- `main` → productie auto-deploy.
- PR's → preview deploy met staging-env.
- Build-command: `next build`. Install: `pnpm install --frozen-lockfile`.

**Supabase-migraties:**
- Lokaal: `supabase db reset` om opnieuw te seeden.
- Staging/prod: `supabase db push` via GitHub Action op merge.
- Nooit handmatig SQL draaien op prod — altijd via migratie-bestand.

**DNS:**
- Apex `studiojeanine.nl` → Vercel.
- `www` → 301 naar apex.
- Mail (Resend domein-verificatie): SPF, DKIM, DMARC records.

**Monitoring:**
- Vercel logs voor server-errors.
- Supabase logs voor DB-errors.
- Sentry (optioneel, fase 6+) voor frontend exceptions.

**Backup:**
- Supabase doet automatische dagelijkse backups op pro-tier.
- Wekelijkse `pg_dump` naar privé S3-bucket via cron (na fase 5).

---

## 13. Checklist — wat ik nog van Jeanine nodig heb

Vul aan zodra Jeanine deze aanlevert. Tot die tijd staan placeholders in `business.ts`.

**Bedrijf & branding:**
- [ ] Officiële bedrijfsnaam + tagline (1 zin)
- [ ] KvK-nummer
- [ ] BTW-nummer
- [ ] IBAN (alleen voor toekomstige facturatie)
- [ ] Logo (SVG bij voorkeur, anders PNG ≥ 1024px)
- [ ] Brand kleuren (primary + accent, hex)
- [ ] Lettertype-voorkeur (display + body) of vrije keuze van mij
- [ ] Algemene voorwaarden + privacy-statement (PDF of tekst)

**Contact & locatie:**
- [ ] Zakelijk e-mailadres
- [ ] Telefoonnummer
- [ ] WhatsApp-link (optioneel)
- [ ] Adres (straat, postcode, plaats) — alleen indien klanten op locatie komen
- [ ] Instagram/TikTok handles

**Content:**
- [ ] Profielfoto Jeanine (≥ 1500px, vrij van rechten)
- [ ] 6–12 portfolio-foto's regulier (knip/kleur/föhn)
- [ ] 6–12 portfolio-foto's bruid
- [ ] "Over mij"-tekst (200–400 woorden)
- [ ] 3 reviews/testimonials (naam mag voornaam + initiaal)

**Diensten:**
- [ ] Per dienst: naam, beschrijving, duur in minuten, prijs in euro's, kind (regulier/bruid)
- [ ] Eventueel buffer-tijd na dienst (schoonmaak/setup)
- [ ] Welke reguliere diensten online boekbaar zijn (vrijwel altijd: alle)

**Werktijden:**
- [ ] Openingstijden per weekdag (start–eind)
- [ ] Lunchpauzes? (zo ja, blokken we via time_off)
- [ ] Vakantiedagen komende 6 maanden

**Bruid-specifiek:**
- [ ] Welke bruidsdiensten worden aangeboden (proefsessie, styling-dag, bruidsmeisjes, …)
- [ ] Indicatieve budget-ranges voor het lead-formulier
- [ ] Standaardtekst voor de "we nemen contact op" e-mail

**Operationeel:**
- [ ] E-mailadres voor admin-notificaties (mag zelfde zijn als zakelijk)
- [ ] Domeinnaam (heeft Jeanine die al? zo ja: bij welke registrar)
- [ ] Wie krijgt productie-toegang tot Vercel/Supabase (alleen Jeanine? of ook ik?)

---

**Einde brief.** Als je iets mist of anders wilt vóór Fase 1 begint — geef het door, dan pas ik dit bestand aan.
