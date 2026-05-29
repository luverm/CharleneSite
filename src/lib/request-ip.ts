import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort client IP. Works behind Vercel's edge proxy and most
 * reverse proxies. Falls back to "unknown" so rate-limiting remains
 * effective even if the IP can't be determined (group by IP="unknown").
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}
