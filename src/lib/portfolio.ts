import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const PORTFOLIO_DIR = path.join(process.cwd(), "public", "images", "portfolio");
const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".webp", ".avif"];
export const PORTFOLIO_BUCKET = "portfolio";

/** site_content key for the photo shown in the homepage "Over" block. */
export const ABOUT_IMAGE_KEY = "home.about.image";

/** Fallback "Over" photo when none is picked. */
export const ABOUT_IMAGE_FALLBACK = "/images/portfolio/placeholder.jpg";

export type PortfolioImage = {
  src: string;
  alt: string;
  /** Storage object name when the image lives in Supabase Storage. */
  name?: string;
};

async function listFsPortfolio(): Promise<PortfolioImage[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(PORTFOLIO_DIR);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  return entries
    .filter((name) => ALLOWED_EXT.includes(path.extname(name).toLowerCase()))
    .sort()
    .map((name) => ({
      src: `/images/portfolio/${name}`,
      alt: path.parse(name).name.replace(/[-_]/g, " "),
    }));
}

/** The admin-set display order, stored as a JSON name list in site_content. */
const PORTFOLIO_ORDER_KEY = "portfolio.order";

async function getPortfolioOrder(): Promise<string[]> {
  try {
    const svc = createSupabaseServiceClient();
    const { data, error } = await svc
      .from("site_content")
      .select("value")
      .eq("key", PORTFOLIO_ORDER_KEY)
      .maybeSingle();
    if (error || !data) return [];
    const parsed: unknown = JSON.parse((data as { value: string }).value);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

export async function savePortfolioOrder(names: string[]): Promise<void> {
  const svc = createSupabaseServiceClient();
  const { error } = await svc.from("site_content").upsert(
    {
      key: PORTFOLIO_ORDER_KEY,
      value: JSON.stringify(names),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) throw error;
}

/** Images uploaded by the admin to the Supabase Storage bucket. */
export async function listStoragePortfolio(): Promise<PortfolioImage[]> {
  try {
    const svc = createSupabaseServiceClient();
    const { data, error } = await svc.storage
      .from(PORTFOLIO_BUCKET)
      .list("", { limit: 200, sortBy: { column: "name", order: "asc" } });
    if (error || !data) return [];
    const images = data
      .filter((o) =>
        ALLOWED_EXT.includes(path.extname(o.name).toLowerCase()),
      )
      .map((o) => ({
        src: svc.storage.from(PORTFOLIO_BUCKET).getPublicUrl(o.name).data
          .publicUrl,
        alt: path.parse(o.name).name.replace(/[-_]/g, " "),
        name: o.name,
      }));

    // Apply the admin-set order; images not in it (newly uploaded) go last.
    const order = await getPortfolioOrder();
    if (order.length > 0) {
      const rank = new Map(order.map((n, i) => [n, i]));
      const FALLBACK = Number.MAX_SAFE_INTEGER;
      images.sort((a, b) => {
        const ra = rank.get(a.name) ?? FALLBACK;
        const rb = rank.get(b.name) ?? FALLBACK;
        return ra !== rb ? ra - rb : a.name.localeCompare(b.name);
      });
    }
    return images;
  } catch {
    return [];
  }
}

/** Storage images if any were uploaded, otherwise the bundled /public set. */
export async function listPortfolioImages(): Promise<PortfolioImage[]> {
  const fromStorage = await listStoragePortfolio();
  if (fromStorage.length > 0) return fromStorage;
  return listFsPortfolio();
}
