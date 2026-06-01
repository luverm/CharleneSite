# Demo-data voor Charlène

Vult de hele app met Nederlandse demo-content en is in één stap weer te
wissen. Bedoeld om Charlène een werkende, gevulde versie te laten zien.

## Inhoud

| Bestand | Doel |
|---|---|
| `demo_seed.sql` | Voegt alle demo-data toe (idempotent — veilig om te herhalen). |
| `demo_teardown.sql` | Wist uitsluitend de demo-data; basisconfig blijft staan. |

Gevuld worden: **klanten**, een volle **agenda** (vorige/deze/volgende week
met verschillende statussen en diensten), **facturen**, **reviews**,
**admin-notificaties**, een **chatgesprek**, de **wachtlijst** en het
**e-maillog**.

## Vóór de demo (eenmalig opzetten)

1. **Hosted Supabase-project** aangemaakt en alle migraties toegepast
   (`supabase/migrations/`, t/m `0023`). Via de CLI: `supabase db push`,
   of plak de migraties in de SQL-editor.
2. **Vercel-deploy** met de env-variabelen uit `.env.local.example`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, SMTP optioneel,
   `ADMIN_ICS_TOKEN`).
3. **Admin-account**: maak een auth-user in Supabase Studio en koppel:
   ```sql
   update staff set user_id = '<auth user id>'
   where email = 'charlene@example.com';
   ```

## Demo starten

Plak **`demo_seed.sql`** in de Supabase SQL-editor en draai het. Daarna:
- **Agenda** staat vol (sleep een afspraak om te verzetten).
- **/klanten**, **homepage** (reviews + portfolio), **admin-bel** en
  **berichten** tonen content.

De portfolio-foto's zijn placeholder-afbeeldingen die met de repo
meegedeployed worden (`public/images/portfolio/`). Wil je echte foto's?
Upload ze via **Instellingen → portfolio** op de gedeployde site.

## Na de demo opruimen

Plak **`demo_teardown.sql`** in de SQL-editor en draai het. Alle demo-rijen
verdwijnen; staff, diensten, openingstijden en teksten blijven intact.

De placeholder-foto's zitten in de repo en worden hier níét geraakt —
verwijder die desgewenst apart:

```bash
git rm public/images/portfolio/*.png public/images/portfolio/placeholder.jpg
```
