"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  claimStaffIfUnlinked,
  needsAdminSetup,
} from "@/lib/auth/staff-bootstrap";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export type AuthResult = { ok: true } | { ok: false; message: string };

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Wachtwoord moet minstens 8 tekens zijn."),
});

const setupSchema = credentialsSchema
  .extend({ confirm: z.string() })
  .refine((d) => d.password === d.confirm, {
    message: "De wachtwoorden komen niet overeen.",
    path: ["confirm"],
  });

export async function signInWithPassword(
  formData: FormData,
): Promise<AuthResult> {
  const ip = await getClientIp();
  if (
    !(await rateLimit({ key: `login:${ip}`, max: 10, windowMs: 5 * 60 * 1000 }))
      .ok
  ) {
    return { ok: false, message: "Te veel pogingen. Wacht een paar minuten." };
  }

  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Vul een geldig e-mailadres en wachtwoord in." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return { ok: false, message: "E-mailadres of wachtwoord onjuist." };
  }

  // Self-heal: link the staff row if it isn't yet (no-op otherwise).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    try {
      await claimStaffIfUnlinked(user.id, user.email ?? null);
    } catch (e) {
      console.error("[auth] claim after login failed", e);
    }
  }

  return { ok: true };
}

export async function setupAdmin(formData: FormData): Promise<AuthResult> {
  const ip = await getClientIp();
  if (
    !(await rateLimit({ key: `setup:${ip}`, max: 5, windowMs: 10 * 60 * 1000 }))
      .ok
  ) {
    return { ok: false, message: "Te veel pogingen. Wacht even." };
  }

  const parsed = setupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Ongeldige invoer.",
    };
  }

  if (!(await needsAdminSetup())) {
    return {
      ok: false,
      message: "Er is al een beheerder ingesteld. Log gewoon in.",
    };
  }

  const svc = createSupabaseServiceClient();

  // Create a confirmed user (no email round-trip). If an auth user with
  // this address already exists (e.g. a leftover magic-link attempt),
  // reuse it and just set the password.
  let userId: string;
  const created = await svc.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (created.data.user) {
    userId = created.data.user.id;
  } else {
    const { data: list } = await svc.auth.admin.listUsers();
    const existing = list?.users.find(
      (u) => u.email?.toLowerCase() === parsed.data.email,
    );
    if (!existing) {
      console.error("[auth] setup createUser failed", created.error);
      return { ok: false, message: "Account aanmaken mislukt. Probeer opnieuw." };
    }
    await svc.auth.admin.updateUserById(existing.id, {
      password: parsed.data.password,
      email_confirm: true,
    });
    userId = existing.id;
  }

  await claimStaffIfUnlinked(userId, parsed.data.email);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return {
      ok: false,
      message:
        "Account aangemaakt, maar automatisch inloggen mislukt. Ga naar de inlogpagina.",
    };
  }

  return { ok: true };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
