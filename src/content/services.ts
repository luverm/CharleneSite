// Single source of truth for the service catalogue. Mirrored to
// supabase/seed.sql and scripts/seed.mjs; the /api/admin/seed-services
// endpoint upserts this list against the live database.
//
// Charlène vult haar eigen prijzen en services later aan via
// Instellingen → Diensten in het admin paneel.

export type SeededService = {
  slug: string;
  name: string;
  description: string | null;
  // `bridal` blijft in het type aanwezig zodat geen DB-migratie nodig is,
  // maar wordt voor Charlène niet meer gebruikt.
  kind: "regular" | "bridal";
  duration_min: number;
  buffer_min: number;
  price_cents: number;
  is_online_bookable: boolean;
  sort_order: number;
};

export const SEED_SERVICES: readonly SeededService[] = [
  {
    slug: "knippen-dames",
    name: "Dames knippen + stylen",
    description: null,
    kind: "regular",
    duration_min: 60,
    buffer_min: 10,
    price_cents: 3000,
    is_online_bookable: true,
    sort_order: 110,
  },
  {
    slug: "knippen-heren",
    name: "Heren knippen",
    description: null,
    kind: "regular",
    duration_min: 30,
    buffer_min: 10,
    price_cents: 2000,
    is_online_bookable: true,
    sort_order: 120,
  },
  {
    slug: "knippen-kids",
    name: "Kinderen knippen",
    description: null,
    kind: "regular",
    duration_min: 30,
    buffer_min: 10,
    price_cents: 1500,
    is_online_bookable: true,
    sort_order: 130,
  },
  {
    slug: "pony-bijknippen",
    name: "Pony bijknippen",
    description: null,
    kind: "regular",
    duration_min: 15,
    buffer_min: 5,
    price_cents: 800,
    is_online_bookable: true,
    sort_order: 140,
  },
];

/** UI-side categories, derived from slug prefix. Eigen categorieën zijn aanpasbaar via het dashboard. */
export type Category = {
  key: string;
  label: string;
  slugPrefix: string;
};

export const SERVICE_CATEGORIES: readonly Category[] = [
  { key: "knippen", label: "Knippen", slugPrefix: "knippen-" },
];

export function categoryForSlug(slug: string): Category | null {
  for (const c of SERVICE_CATEGORIES) {
    if (slug.startsWith(c.slugPrefix) || slug === c.slugPrefix.replace(/-$/, "")) {
      return c;
    }
  }
  if (slug === "pony-bijknippen") return SERVICE_CATEGORIES[0];
  return null;
}
