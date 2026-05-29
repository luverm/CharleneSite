import "server-only";
import { getSiteValue, getSiteStringRecord } from "@/lib/db/site-content";

/** An admin-defined heading services can be grouped under. */
export type ServiceCategory = { id: string; label: string };

export const CATEGORY_LIST_KEY = "service.category_list";
export const CATEGORY_MAP_KEY = "service.category_map";

/** The admin-defined category headings, in display order. */
export async function listServiceCategories(): Promise<ServiceCategory[]> {
  const raw = await getSiteValue(CATEGORY_LIST_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[]).filter(
      (x): x is ServiceCategory =>
        !!x &&
        typeof x === "object" &&
        typeof (x as ServiceCategory).id === "string" &&
        typeof (x as ServiceCategory).label === "string",
    );
  } catch {
    return [];
  }
}

/** Service id → category id. */
export async function getServiceCategoryMap(): Promise<
  Record<string, string>
> {
  return getSiteStringRecord(CATEGORY_MAP_KEY);
}
