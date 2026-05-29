import { describe, expect, it, beforeEach } from "vitest";
import { rateLimit, _resetRateLimitStore } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => _resetRateLimitStore());

  it("allows up to `max` events within the window", async () => {
    const opts = { key: "ip:1", max: 3, windowMs: 60_000 };
    const a = await rateLimit(opts);
    const b = await rateLimit(opts);
    const c = await rateLimit(opts);
    const d = await rateLimit(opts);
    expect(a.ok && b.ok && c.ok).toBe(true);
    expect(d.ok).toBe(false);
    expect(d.remaining).toBe(0);
  });

  it("scopes counters per key", async () => {
    const optsA = { key: "ip:a", max: 1, windowMs: 60_000 };
    const optsB = { key: "ip:b", max: 1, windowMs: 60_000 };
    expect((await rateLimit(optsA)).ok).toBe(true);
    expect((await rateLimit(optsB)).ok).toBe(true);
    expect((await rateLimit(optsA)).ok).toBe(false);
  });
});
