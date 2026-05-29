// Pure types + formatters for `services`. Safe to import from client
// components — does NOT pull in `next/headers` or any server-only deps.
// The DB-fetching helpers live in `@/lib/db/services` (server-only).

import { SERVICE_CATEGORIES, categoryForSlug } from "@/content/services";

export type ServiceKind = "regular" | "bridal";

export type Service = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  kind: ServiceKind;
  duration_min: number;
  buffer_min: number;
  price_cents: number;
  is_online_bookable: boolean;
  sort_order: number;
};

const KIND_RANK: Record<ServiceKind, number> = { regular: 0, bridal: 1 };

function categoryRank(slug: string): number {
  const cat = categoryForSlug(slug);
  if (!cat) return SERVICE_CATEGORIES.length;
  const i = SERVICE_CATEGORIES.findIndex((c) => c.key === cat.key);
  return i === -1 ? SERVICE_CATEGORIES.length : i;
}

/**
 * The one canonical service order, used on every page and tool so the
 * list never looks different per surface: regular before bridal, then
 * by UI category (Knippen → Kleuren → Party hair & make-up), then by
 * sort_order, then name. Derived from the slug/category — not solely
 * from the DB sort_order — so it stays logical even if that column is
 * inconsistent.
 */
export function compareServices(
  a: Pick<Service, "slug" | "kind" | "sort_order" | "name">,
  b: Pick<Service, "slug" | "kind" | "sort_order" | "name">,
): number {
  const k = KIND_RANK[a.kind] - KIND_RANK[b.kind];
  if (k !== 0) return k;
  const c = categoryRank(a.slug) - categoryRank(b.slug);
  if (c !== 0) return c;
  const s = a.sort_order - b.sort_order;
  if (s !== 0) return s;
  return a.name.localeCompare(b.name, "nl");
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} uur` : `${h} uur ${m} min`;
}
