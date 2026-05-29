import "server-only";

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();
let lastSweepAt = 0;

const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

function maybeSweep(now: number) {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return;
  lastSweepAt = now;
  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

export type RateLimitOptions = {
  /** Limit identifier (e.g. "lead:10.0.0.1"). */
  key: string;
  /** Maximum number of allowed events within the window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

function inMemory(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  maybeSweep(now);

  const bucket = store.get(opts.key);
  if (!bucket || bucket.resetAt <= now) {
    const fresh: Bucket = { count: 1, resetAt: now + opts.windowMs };
    store.set(opts.key, fresh);
    return { ok: true, remaining: opts.max - 1, resetAt: fresh.resetAt };
  }

  if (bucket.count >= opts.max) {
    return { ok: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return {
    ok: true,
    remaining: opts.max - bucket.count,
    resetAt: bucket.resetAt,
  };
}

/**
 * Atomic fixed-window counter in Upstash Redis (REST). Shared across all
 * serverless instances. Any failure returns null so the caller falls
 * back to the in-memory limiter rather than blocking legitimate users.
 */
async function upstash(opts: RateLimitOptions): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redisKey = `rl:${opts.key}`;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["PEXPIRE", redisKey, String(opts.windowMs), "NX"],
      ]),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ result?: number }>;
    const count = data?.[0]?.result;
    if (typeof count !== "number") return null;

    const resetAt = Date.now() + opts.windowMs;
    if (count > opts.max) {
      return { ok: false, remaining: 0, resetAt };
    }
    return { ok: true, remaining: opts.max - count, resetAt };
  } catch {
    return null;
  }
}

/**
 * Fixed-window rate limiter. Uses Upstash Redis when configured
 * (cross-instance accurate), otherwise a per-process in-memory store.
 */
export async function rateLimit(
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const remote = await upstash(opts);
  return remote ?? inMemory(opts);
}

/** Test-only: clear the in-memory store. */
export function _resetRateLimitStore(): void {
  store.clear();
  lastSweepAt = 0;
}
