// Seed runner — inserts the same data as supabase/seed.sql via the
// REST API using the service-role key. Idempotent: safe to re-run.
//
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = join(here, "..", ".env.local");
try {
  const txt = readFileSync(envPath, "utf-8");
  for (const line of txt.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  // env file optional
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const STAFF_ID = "00000000-0000-0000-0000-000000000001";
const STAFF_EMAIL = "charlene@example.com";

const services = [
  // Knippen
  { slug: "knippen-dames", name: "Dames knippen + stylen", description: null, kind: "regular", duration_min: 60, buffer_min: 10, price_cents: 3495, is_online_bookable: true, sort_order: 110 },
  { slug: "knippen-teen", name: "Meiden knippen + stylen teen (12–18 jaar)", description: null, kind: "regular", duration_min: 50, buffer_min: 10, price_cents: 2995, is_online_bookable: true, sort_order: 120 },
  { slug: "knippen-junior", name: "Meiden knippen + stylen junior (6–12 jaar)", description: null, kind: "regular", duration_min: 40, buffer_min: 10, price_cents: 2595, is_online_bookable: true, sort_order: 130 },
  { slug: "knippen-mini", name: "Meiden knippen + stylen mini (0–6 jaar)", description: null, kind: "regular", duration_min: 30, buffer_min: 10, price_cents: 1795, is_online_bookable: true, sort_order: 140 },
  { slug: "pony-bijknippen", name: "Pony of curtain bangs bijknippen", description: null, kind: "regular", duration_min: 15, buffer_min: 5, price_cents: 995, is_online_bookable: true, sort_order: 150 },
  // Party hair & make-up
  { slug: "feestkapsel", name: "Feestkapsel", description: "Kom met schoon, droog haar: graag vooraf 2 keer wassen met shampoo.", kind: "regular", duration_min: 90, buffer_min: 15, price_cents: 4995, is_online_bookable: true, sort_order: 210 },
  { slug: "feestkapsel-extensions", name: "Feestkapsel incl. clip-in haarextensions", description: "Kom met schoon, droog haar: graag vooraf 2 keer wassen met shampoo.", kind: "regular", duration_min: 90, buffer_min: 15, price_cents: 7495, is_online_bookable: true, sort_order: 220 },
  { slug: "feestkapsel-makeup", name: "Feestkapsel incl. make-up", description: null, kind: "regular", duration_min: 120, buffer_min: 15, price_cents: 7495, is_online_bookable: true, sort_order: 230 },
  { slug: "feestkapsel-mini", name: "Feestkapsel mini (0–6 jaar)", description: null, kind: "regular", duration_min: 30, buffer_min: 10, price_cents: 1995, is_online_bookable: true, sort_order: 240 },
  { slug: "feestkapsel-kids", name: "Feestkapsel kids (6–12 jaar)", description: null, kind: "regular", duration_min: 45, buffer_min: 10, price_cents: 2995, is_online_bookable: true, sort_order: 250 },
  // Kleuren
  { slug: "kleur-highlights-half", name: "High en/of lowlights — Half head", description: "Subtiele, fijne plukjes die je haar een frisse uitstraling geven.", kind: "regular", duration_min: 240, buffer_min: 15, price_cents: 13995, is_online_bookable: true, sort_order: 310 },
  { slug: "kleur-highlights-full", name: "High en/of lowlights — Full head", description: null, kind: "regular", duration_min: 240, buffer_min: 15, price_cents: 15995, is_online_bookable: true, sort_order: 320 },
  { slug: "kleur-toner", name: "Toner / glansbehandeling (incl. föhnen en stylen)", description: "Voor het opfrissen van blond, neutraliseren van warmte of extra glans.", kind: "regular", duration_min: 80, buffer_min: 10, price_cents: 4495, is_online_bookable: true, sort_order: 330 },
  { slug: "kleur-spoeling", name: "Kleurspoeling (incl. föhnen en stylen)", description: "Verfrissende, tijdelijke kleuring die glans en diepte geeft. Wast geleidelijk uit.", kind: "regular", duration_min: 120, buffer_min: 15, price_cents: 6995, is_online_bookable: true, sort_order: 340 },
  // Bridal — request only
  { slug: "bruid-locatie-haar", name: "Aanvraag: bruidshaarstyling op locatie incl. proefsessie", description: null, kind: "bridal", duration_min: 240, buffer_min: 30, price_cents: 24000, is_online_bookable: false, sort_order: 410 },
  { slug: "bruid-locatie-haar-makeup", name: "Aanvraag: bruidshaarstyling en make-up op locatie incl. proefsessie", description: null, kind: "bridal", duration_min: 240, buffer_min: 30, price_cents: 31500, is_online_bookable: false, sort_order: 420 },
  { slug: "bruid-proefsessie-haar", name: "Proefsessie bruidshaarstyling", description: null, kind: "bridal", duration_min: 180, buffer_min: 30, price_cents: 0, is_online_bookable: false, sort_order: 430 },
  { slug: "bruid-proefsessie-haar-makeup", name: "Proefsessie bruidshaarstyling en make-up", description: null, kind: "bridal", duration_min: 210, buffer_min: 30, price_cents: 0, is_online_bookable: false, sort_order: 440 },
];

async function main() {
  // Staff
  const { error: staffErr } = await supabase
    .from("staff")
    .upsert(
      { id: STAFF_ID, display_name: "Charlène", email: STAFF_EMAIL, is_active: true },
      { onConflict: "id" },
    );
  if (staffErr) throw staffErr;
  console.log("✓ staff");

  // Services
  const { error: svcErr } = await supabase
    .from("services")
    .upsert(services, { onConflict: "slug" });
  if (svcErr) throw svcErr;
  console.log(`✓ ${services.length} services`);

  // Opening hours: Mon–Fri 09:00–17:00. Saturdays reserved for bridal.
  await supabase.from("opening_hours").delete().eq("staff_id", STAFF_ID);
  const hours = [1, 2, 3, 4, 5].map((weekday) => ({
    staff_id: STAFF_ID,
    weekday,
    start_time: "09:00:00",
    end_time: "17:00:00",
  }));
  const { error: hoursErr } = await supabase.from("opening_hours").insert(hours);
  if (hoursErr) throw hoursErr;
  console.log(`✓ ${hours.length} opening_hours rows`);

  console.log("\nSeed complete.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
