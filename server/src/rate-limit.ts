import type { Context, MiddlewareHandler } from "hono";

export type ClientKey = (c: Context) => string;

/** Uses the client address headers that Vercel, Cloudflare and most proxies set. */
const keyFromHeaders: ClientKey = (c) =>
  c.req.header("cf-connecting-ip") ??
  c.req.header("x-real-ip") ??
  c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
  "unknown";

interface Window {
  count: number;
  resetAt: number;
}

/**
 * A fixed-window rate limit per client key, kept in memory. Each server
 * instance counts on its own, which is enough to stop casual abuse of a demo.
 * Use a shared store such as Cloudflare's rate limiting binding for more.
 */
export function rateLimit(options: { windowMs: number; max: number; key?: ClientKey }): MiddlewareHandler {
  const { windowMs, max, key = keyFromHeaders } = options;
  const windows = new Map<string, Window>();

  return async (c, next) => {
    const time = Date.now();
    if (windows.size > 10_000) {
      for (const [k, w] of windows) if (w.resetAt <= time) windows.delete(k);
    }

    const id = key(c);
    let entry = windows.get(id);
    if (!entry || entry.resetAt <= time) {
      entry = { count: 0, resetAt: time + windowMs };
      windows.set(id, entry);
    }
    entry.count += 1;

    const resetSeconds = Math.ceil((entry.resetAt - time) / 1000);
    c.header("RateLimit-Limit", String(max));
    c.header("RateLimit-Remaining", String(Math.max(0, max - entry.count)));
    c.header("RateLimit-Reset", String(resetSeconds));

    if (entry.count > max) {
      c.header("Retry-After", String(resetSeconds));
      return c.json({ error: "Too many requests. Try again in a minute." }, 429);
    }
    await next();
  };
}
