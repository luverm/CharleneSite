"use server";

import { z } from "zod";
import { insertWaitlist, setWaitlistResolved } from "@/lib/db/waitlist";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email/client";
import { waitlistConfirmationEmail } from "@/lib/email/messages";
import { recordAdminNotification } from "@/lib/db/notifications";

async function notifyWaitlist(d: {
  serviceId?: string;
  preferredDate?: string;
  fullName: string;
  email: string;
  phone?: string;
  note?: string;
}): Promise<void> {
  let serviceName: string | null = null;
  try {
    if (d.serviceId) {
      const svc = createSupabaseServiceClient();
      const { data } = await svc
        .from("services")
        .select("name")
        .eq("id", d.serviceId)
        .maybeSingle();
      serviceName = (data as { name: string } | null)?.name ?? null;
    }
  } catch {
    serviceName = null;
  }

  try {
    await sendEmail({
      to: d.email,
      context: "waitlist_confirmation",
      ...(await waitlistConfirmationEmail({
        fullName: d.fullName,
        serviceName,
        preferredDate: d.preferredDate || null,
      })),
    });
  } catch (err) {
    console.error("[waitlist] confirmation mail failed:", err);
  }

  await recordAdminNotification({
    kind: "waitlist_added",
    title: "Nieuwe wachtlijst-aanmelding",
    body: [
      `${d.fullName} <${d.email}>`,
      d.phone ? `Telefoon: ${d.phone}` : null,
      `Dienst: ${serviceName ?? "geen voorkeur"}`,
      d.preferredDate ? `Voorkeursdag: ${d.preferredDate}` : null,
      d.note ? `Notitie: ${d.note}` : null,
    ]
      .filter((l): l is string => l !== null)
      .join("\n"),
    href: "/instellingen/wachtlijst",
  });
}

const joinSchema = z.object({
  serviceId: z.string().uuid().optional().or(z.literal("")),
  preferredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  website: z.string().max(0).optional().or(z.literal("")), // honeypot
});

export type JoinWaitlistResult =
  | { ok: true }
  | { ok: false; code: "INVALID_INPUT" | "RATE_LIMITED" };

export async function joinWaitlist(
  input: unknown,
): Promise<JoinWaitlistResult> {
  const parsed = joinSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const d = parsed.data;
  if (d.website) return { ok: false, code: "INVALID_INPUT" };

  const ip = await getClientIp();
  const limited = await rateLimit({
    key: `waitlist:${ip}`,
    max: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) return { ok: false, code: "RATE_LIMITED" };

  try {
    await insertWaitlist({
      serviceId: d.serviceId || null,
      preferredDate: d.preferredDate || null,
      fullName: d.fullName,
      email: d.email,
      phone: d.phone || null,
      note: d.note || null,
    });
  } catch (err) {
    console.error("[waitlist] insert failed:", err);
    return { ok: false, code: "INVALID_INPUT" };
  }

  // Best-effort — a mail hiccup must not fail the signup.
  await notifyWaitlist({
    serviceId: d.serviceId || undefined,
    preferredDate: d.preferredDate || undefined,
    fullName: d.fullName,
    email: d.email,
    phone: d.phone || undefined,
    note: d.note || undefined,
  });

  return { ok: true };
}

export async function resolveWaitlistAction(
  id: string,
  resolved: boolean,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  try {
    await setWaitlistResolved(id, resolved);
  } catch {
    return { ok: false };
  }
  return { ok: true };
}
