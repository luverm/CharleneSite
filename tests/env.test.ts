import { describe, expect, it, afterEach } from "vitest";
import { getServiceRoleKey, getServerEnv } from "@/lib/env";

// Regression: the Supabase service client (used by every admin read AND write,
// incl. requireAdmin) must depend ONLY on SUPABASE_SERVICE_ROLE_KEY. It used to
// go through getServerEnv(), which also validated ADMIN_ICS_TOKEN (min 16) — so
// a missing/short ICS token threw a ZodError inside requireAdmin (outside its
// try), producing a hard server error on admin mutations like setting a service
// colour, while read helpers silently swallowed the same throw.
describe("env: service client decoupled from ADMIN_ICS_TOKEN", () => {
  const originalIcs = process.env.ADMIN_ICS_TOKEN;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  afterEach(() => {
    process.env.ADMIN_ICS_TOKEN = originalIcs;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  it("getServiceRoleKey works even when ADMIN_ICS_TOKEN is unset", () => {
    delete process.env.ADMIN_ICS_TOKEN;
    expect(getServiceRoleKey()).toBe(originalKey);
  });

  it("getServiceRoleKey throws when the service-role key is missing", () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(() => getServiceRoleKey()).toThrow();
  });

  it("getServerEnv still requires ADMIN_ICS_TOKEN (ICS feed feature)", () => {
    delete process.env.ADMIN_ICS_TOKEN;
    expect(() => getServerEnv()).toThrow();
  });
});
