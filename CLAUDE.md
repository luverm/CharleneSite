# Charlène — Project Brief

> Site- en boekingsplatform voor Charlène's kapsalon. Gekopieerd van het
> Jeanine-platform met de bruidsstyling-functionaliteit verwijderd en
> neutrale branding als startpunt.

## Wat zit erin

- Online boeken (knippen, kleuren, feestkapsels, etc. — vrij configureerbaar)
- Klant-bevestigingen, herinneringen, terugkom-mail, wachtlijst, reviews
- Admin agenda met sleep-rescheduling, kleurtjes per dienst
- Facturen (auto vanuit boeking + handmatig) met PDF-download
- Klanten- en e-maillog-beheer met multi-select verwijderen
- Chat-widget op de site, met admin-inbox
- Volledig bewerkbaar via Instellingen: bedrijfsgegevens, openingstijden,
  extra openingsdagen, vrije dagen, diensten + categorieën, portfolio,
  reviews, teksten, mailteksten

## Stack

| Laag | Keuze |
|---|---|
| Framework | Next.js 16 (App Router) |
| Taal | TypeScript strict |
| Database | Supabase Postgres + Auth + Storage |
| UI | Tailwind CSS v4 + shadcn/ui |
| Forms | react-hook-form + zod |
| PDF | pdf-lib |
| Mail | Resend / SMTP |
| Hosting | Vercel |

## Branding aanpassen

1. `src/content/business.ts` — naam, adres, KvK, social, kleurvoorkeur
2. `src/content/landing.ts` — homepage hero/about defaults
3. `src/app/globals.css` — kleur-tokens (`--primary`, `--accent`, etc.)
4. Logo: er is bewust geen logo-bestand meegekomen. Upload via
   Storage / portfolio of voeg een nieuw bestand toe in `public/`.

Alle teksten op de site kunnen via **Instellingen → Teksten** gewijzigd
worden zonder code te raken.

## Setup

```bash
pnpm install
cp .env.local.example .env.local   # vul de echte sleutels in
supabase start                      # lokaal DB-stack
supabase db reset                   # past alle migraties + seed.sql toe
pnpm dev
```

## Eerste admin account

```sql
-- 1. Maak in Supabase Studio een auth-user aan (mail + tijdelijk wachtwoord)
-- 2. Link aan de seeded staff row:
update staff set user_id = '<auth user id>' where email = 'charlene@example.com';
```

## Migraties

Nieuwe schema-wijzigingen = nieuw `supabase/migrations/00xx_*.sql` bestand,
nooit oude bewerken. Lokaal opnieuw zaaien met `supabase db reset`.
