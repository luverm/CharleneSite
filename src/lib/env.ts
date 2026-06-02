import { z } from "zod";

const serviceRoleKeySchema = z.string().min(1);

const icsSchema = z.object({
  ADMIN_ICS_TOKEN: z.string().min(16),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
});

const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

export const publicEnv = clientEnv;

/**
 * The Supabase service-role key — the ONLY server secret the service client
 * needs. Validated on its own so unrelated server config (e.g. the ICS token)
 * can never break every admin read/write by throwing here.
 */
export function getServiceRoleKey(): string {
  if (typeof window !== "undefined") {
    throw new Error("getServiceRoleKey must not be called from the browser");
  }
  return serviceRoleKeySchema.parse(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Server config for the ICS calendar feed (feed route, seed route, agenda
 * settings page). Only call this where the ICS token is genuinely needed —
 * not for general DB access.
 */
export function getServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv must not be called from the browser");
  }
  return {
    SUPABASE_SERVICE_ROLE_KEY: getServiceRoleKey(),
    ...icsSchema.parse({ ADMIN_ICS_TOKEN: process.env.ADMIN_ICS_TOKEN }),
  };
}
