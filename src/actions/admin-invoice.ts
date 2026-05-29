"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { deleteAllInvoices, deleteInvoices } from "@/lib/db/invoices";
import { writeAuditLog } from "@/lib/db/bookings";
import { uuidString } from "@/lib/schemas/uuid";

const BULK_DELETE_PHRASE = "VERWIJDER";

/**
 * Hard-deletes EVERY invoice (and via cascade, every invoice line).
 * Irreversible. Double-guarded: admin only + exact confirmation phrase.
 */
export async function deleteAllInvoicesAction(
  confirm: string,
): Promise<{ ok: boolean; deleted?: number }> {
  await requireAdmin();
  if (confirm !== BULK_DELETE_PHRASE) return { ok: false };

  let deleted: number;
  try {
    deleted = await deleteAllInvoices();
  } catch (err) {
    console.error("[admin-invoice] bulk delete failed:", err);
    return { ok: false };
  }

  await writeAuditLog({
    actor: "admin",
    action: "invoice.bulk_delete",
    entity: "invoice",
    entityId: "00000000-0000-0000-0000-000000000000",
    payload: { deleted },
  }).catch(() => {});

  revalidatePath("/facturen");
  revalidatePath("/dashboard");
  revalidatePath("/instellingen/financien");
  return { ok: true, deleted };
}

/** Hard-deletes the selected invoices (and their lines via cascade). */
export async function deleteInvoicesAction(
  ids: unknown,
): Promise<{ ok: boolean; deleted?: number }> {
  await requireAdmin();
  const parsed = z.array(uuidString()).min(1).max(500).safeParse(ids);
  if (!parsed.success) return { ok: false };

  let deleted: number;
  try {
    deleted = await deleteInvoices(parsed.data);
  } catch (err) {
    console.error("[admin-invoice] delete selected failed:", err);
    return { ok: false };
  }

  await writeAuditLog({
    actor: "admin",
    action: "invoice.delete_selected",
    entity: "invoice",
    entityId: "00000000-0000-0000-0000-000000000000",
    payload: { count: deleted },
  }).catch(() => {});

  revalidatePath("/facturen");
  revalidatePath("/dashboard");
  revalidatePath("/instellingen/financien");
  return { ok: true, deleted };
}
