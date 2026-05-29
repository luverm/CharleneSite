"use server";

import { revalidatePath } from "next/cache";
import {
  markAllAdminNotificationsRead,
  markAdminNotificationRead,
  deleteAdminNotifications,
} from "@/lib/db/notifications";
import { requireAdmin } from "@/lib/auth/require-admin";
import { uuidString } from "@/lib/schemas/uuid";
import { z } from "zod";

export async function markAllNotificationsReadAction(): Promise<{
  ok: boolean;
}> {
  await requireAdmin();
  try {
    await markAllAdminNotificationsRead();
  } catch (err) {
    console.error("[notifications] mark all failed:", err);
    return { ok: false };
  }
  revalidatePath("/notificaties");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function markNotificationReadAction(
  id: string,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const parsed = uuidString().safeParse(id);
  if (!parsed.success) return { ok: false };
  try {
    await markAdminNotificationRead(parsed.data);
  } catch (err) {
    console.error("[notifications] mark failed:", err);
    return { ok: false };
  }
  revalidatePath("/notificaties");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteNotificationsAction(
  ids: unknown,
): Promise<{ ok: boolean; deleted?: number }> {
  await requireAdmin();
  const parsed = z.array(uuidString()).min(1).max(500).safeParse(ids);
  if (!parsed.success) return { ok: false };
  let deleted: number;
  try {
    deleted = await deleteAdminNotifications(parsed.data);
  } catch (err) {
    console.error("[notifications] delete failed:", err);
    return { ok: false };
  }
  revalidatePath("/notificaties");
  revalidatePath("/dashboard");
  return { ok: true, deleted };
}
