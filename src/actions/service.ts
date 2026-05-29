"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { serviceUpsertSchema } from "@/lib/schemas/service";
import {
  upsertService,
  deleteService as dbDeleteService,
  setServiceOrder,
} from "@/lib/db/admin-services";
import { writeAuditLog } from "@/lib/db/bookings";
import {
  getSiteStringArray,
  getSiteStringRecord,
  setSiteValue,
} from "@/lib/db/site-content";
import { CATEGORY_LIST_KEY, CATEGORY_MAP_KEY } from "@/lib/db/service-categories";
import { isAgendaColorKey } from "@/lib/agenda-colors";
import { requireAdmin } from "@/lib/auth/require-admin";

const FEATURED_SERVICES_KEY = "home.featured_services";
const SERVICE_COLORS_KEY = "agenda.service_colors";

const categoryListSchema = z
  .array(
    z.object({
      id: z.string().min(1).max(64),
      label: z.string().trim().min(1).max(60),
    }),
  )
  .max(40);

export async function saveServiceCategoriesAction(
  input: unknown,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const parsed = categoryListSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  try {
    await setSiteValue(CATEGORY_LIST_KEY, JSON.stringify(parsed.data));
  } catch (err) {
    console.error("[service] save categories failed:", err);
    return { ok: false };
  }
  revalidatePath("/instellingen/diensten");
  revalidatePath("/diensten");
  return { ok: true };
}

export async function setServiceCategoryAction(
  serviceId: unknown,
  categoryId: unknown,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (typeof serviceId !== "string" || typeof categoryId !== "string") {
    return { ok: false };
  }
  try {
    const map = await getSiteStringRecord(CATEGORY_MAP_KEY);
    if (categoryId === "") delete map[serviceId];
    else map[serviceId] = categoryId;
    await setSiteValue(CATEGORY_MAP_KEY, JSON.stringify(map));
  } catch (err) {
    console.error("[service] set category failed:", err);
    return { ok: false };
  }
  revalidatePath("/instellingen/diensten");
  revalidatePath("/diensten");
  return { ok: true };
}

export type SaveServiceResult =
  | { ok: true }
  | { ok: false; message: string };

export async function saveServiceAction(input: unknown): Promise<SaveServiceResult> {
  await requireAdmin();
  const parsed = serviceUpsertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.message };
  }
  const row = await upsertService({
    ...parsed.data,
    description: parsed.data.description ?? null,
  });
  await writeAuditLog({
    actor: "admin",
    action: "service.upsert",
    entity: "service",
    entityId: row.id,
    payload: parsed.data,
  }).catch(() => {});
  revalidatePath("/instellingen/diensten");
  revalidatePath("/diensten");
  revalidatePath("/");
  return { ok: true };
}

export async function reorderServicesAction(
  ids: unknown,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (
    !Array.isArray(ids) ||
    ids.length > 200 ||
    ids.some((x) => typeof x !== "string")
  ) {
    return { ok: false };
  }
  try {
    await setServiceOrder(ids as string[]);
  } catch (err) {
    console.error("[service] reorder failed:", err);
    return { ok: false };
  }
  revalidatePath("/instellingen/diensten");
  revalidatePath("/diensten");
  revalidatePath("/boeken");
  revalidatePath("/");
  return { ok: true };
}

export async function setFeaturedServiceAction(
  id: unknown,
  featured: unknown,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (typeof id !== "string" || typeof featured !== "boolean") {
    return { ok: false };
  }
  try {
    const set = new Set(await getSiteStringArray(FEATURED_SERVICES_KEY));
    if (featured) set.add(id);
    else set.delete(id);
    await setSiteValue(FEATURED_SERVICES_KEY, JSON.stringify([...set]));
  } catch (err) {
    console.error("[service] set featured failed:", err);
    return { ok: false };
  }
  revalidatePath("/");
  revalidatePath("/instellingen/diensten");
  return { ok: true };
}

export async function setServiceColorAction(
  id: unknown,
  color: unknown,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  // An empty string clears the colour; otherwise it must be a known key.
  if (typeof id !== "string" || typeof color !== "string") {
    return { ok: false };
  }
  if (color !== "" && !isAgendaColorKey(color)) return { ok: false };
  try {
    const map = await getSiteStringRecord(SERVICE_COLORS_KEY);
    if (color === "") delete map[id];
    else map[id] = color;
    await setSiteValue(SERVICE_COLORS_KEY, JSON.stringify(map));
  } catch (err) {
    console.error("[service] set colour failed:", err);
    return { ok: false };
  }
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  revalidatePath("/instellingen/diensten");
  return { ok: true };
}

export async function deleteServiceAction(id: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  await dbDeleteService(id);
  await writeAuditLog({
    actor: "admin",
    action: "service.delete",
    entity: "service",
    entityId: id,
  }).catch(() => {});
  revalidatePath("/instellingen/diensten");
  revalidatePath("/diensten");
  revalidatePath("/");
  return { ok: true };
}
