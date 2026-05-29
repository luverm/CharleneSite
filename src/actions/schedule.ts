"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import {
  replaceOpeningHours,
  insertTimeOff,
  deleteTimeOff,
  listSpecialOpenings,
  saveSpecialOpenings,
} from "@/lib/db/admin-schedule";
import { writeAuditLog } from "@/lib/db/bookings";
import { getSiteStringArray, setSiteValue } from "@/lib/db/site-content";
import { uuidString } from "@/lib/schemas/uuid";
import { requireAdmin } from "@/lib/auth/require-admin";

const TIMEOFF_HIDDEN_KEY = "timeoff.hidden_notices";

const openingHoursSchema = z.object({
  staffId: uuidString(),
  rows: z.array(
    z.object({
      weekday: z.number().int().min(0).max(6),
      start_time: z.string().regex(/^\d{2}:\d{2}$/),
      end_time: z.string().regex(/^\d{2}:\d{2}$/),
    }),
  ),
});

export async function saveOpeningHoursAction(
  input: unknown,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const parsed = openingHoursSchema.parse(input);
  await replaceOpeningHours(parsed.staffId, parsed.rows);
  await writeAuditLog({
    actor: "admin",
    action: "opening_hours.replace",
    entity: "staff",
    entityId: parsed.staffId,
    payload: { rows: parsed.rows },
  }).catch(() => {});
  revalidatePath("/instellingen/openingstijden");
  return { ok: true };
}

const timeOffSchema = z.object({
  staffId: uuidString(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  reason: z.string().trim().max(200).optional(),
});

export async function addTimeOffAction(input: unknown): Promise<{ ok: boolean }> {
  await requireAdmin();
  const parsed = timeOffSchema.parse(input);
  await insertTimeOff({
    staffId: parsed.staffId,
    startsAt: parsed.startsAt,
    endsAt: parsed.endsAt,
    reason: parsed.reason,
  });
  revalidatePath("/instellingen/vrije-dagen");
  return { ok: true };
}

export async function deleteTimeOffAction(id: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  await deleteTimeOff(id);
  revalidatePath("/instellingen/vrije-dagen");
  revalidatePath("/boeken");
  return { ok: true };
}

const specialOpeningSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
});

/** Adds a one-off opening on a date that's normally closed. */
export async function addSpecialOpeningAction(
  input: unknown,
): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const parsed = specialOpeningSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Ongeldige invoer." };
  if (parsed.data.end <= parsed.data.start) {
    return { ok: false, message: "Eindtijd moet na de starttijd liggen." };
  }
  try {
    const rows = await listSpecialOpenings();
    rows.push({ id: uuidv4(), ...parsed.data });
    await saveSpecialOpenings(rows);
  } catch (err) {
    console.error("[schedule] add special opening failed:", err);
    return { ok: false, message: "Opslaan mislukt." };
  }
  revalidatePath("/instellingen/extra-open");
  revalidatePath("/boeken");
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteSpecialOpeningAction(
  id: string,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (typeof id !== "string") return { ok: false };
  try {
    const rows = await listSpecialOpenings();
    await saveSpecialOpenings(rows.filter((r) => r.id !== id));
  } catch (err) {
    console.error("[schedule] delete special opening failed:", err);
    return { ok: false };
  }
  revalidatePath("/instellingen/extra-open");
  revalidatePath("/boeken");
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Toggles whether an absence shows a public notice on the booking page.
 * The date stays blocked either way — this only hides the banner, e.g.
 * for a private day off.
 */
export async function setTimeOffNoticeAction(
  id: unknown,
  visible: unknown,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const parsedId = uuidString().safeParse(id);
  if (!parsedId.success || typeof visible !== "boolean") {
    return { ok: false };
  }
  try {
    const hidden = new Set(await getSiteStringArray(TIMEOFF_HIDDEN_KEY));
    if (visible) hidden.delete(parsedId.data);
    else hidden.add(parsedId.data);
    await setSiteValue(TIMEOFF_HIDDEN_KEY, JSON.stringify([...hidden]));
  } catch (err) {
    console.error("[schedule] time-off notice toggle failed:", err);
    return { ok: false };
  }
  revalidatePath("/instellingen/vrije-dagen");
  revalidatePath("/boeken");
  return { ok: true };
}
