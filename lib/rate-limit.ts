import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Upstash Redis is the source of truth on Vercel — module-level Map state is
// not shared across serverless instances, so the in-memory fallback below is
// best-effort only (used in dev when env vars are not set).
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const ratelimit =
  url && token
    ? new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX, "1 m"),
        analytics: false,
        prefix: "portfolio:contact",
      })
    : null;

const memorySubmissions = new Map<string, number[]>();

function memoryLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const recent = (memorySubmissions.get(ip) ?? []).filter((t) => t > cutoff);
  if (recent.length >= RATE_LIMIT_MAX) {
    memorySubmissions.set(ip, recent);
    return true;
  }
  recent.push(now);
  memorySubmissions.set(ip, recent);
  return false;
}

export async function isRateLimited(ip: string): Promise<boolean> {
  if (!ratelimit) return memoryLimited(ip);
  const { success } = await ratelimit.limit(ip);
  return !success;
}
