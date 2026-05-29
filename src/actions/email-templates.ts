"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { setSiteValue } from "@/lib/db/site-content";
import { emailTemplateDef } from "@/lib/email/templates";
import { requireAdmin } from "@/lib/auth/require-admin";

const schema = z.object({
  key: z.string().min(1).max(64),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(4000),
});

/** Saves an admin override for one editable e-mail template. */
export async function saveEmailTemplateAction(
  input: unknown,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success || !emailTemplateDef(parsed.data.key)) {
    return { ok: false };
  }
  const { key, subject, body } = parsed.data;
  try {
    await setSiteValue(`email.${key}.subject`, subject);
    await setSiteValue(`email.${key}.body`, body);
  } catch (err) {
    console.error("[email-templates] save failed:", err);
    return { ok: false };
  }
  revalidatePath("/instellingen/mailteksten");
  revalidatePath("/instellingen/terugkommail");
  return { ok: true };
}
