import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const clients = new Map<string, RateLimitInfo>();

export function rateLimiter(options: { windowMs: number; max: number }) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header("x-forwarded-for") || "unknown";
    const now = Date.now();
    const info = clients.get(ip);

    if (!info || info.resetTime < now) {
      clients.set(ip, {
        count: 1,
        resetTime: now + options.windowMs,
      });
    } else {
      info.count++;
      if (info.count > options.max) {
        throw new HTTPException(429, { message: "Too many requests, please try again later." });
      }
    }

    await next();
  };
}
