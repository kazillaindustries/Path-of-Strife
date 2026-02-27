import { Request, Response, NextFunction } from "express";

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};
const MAX_REQUESTS = 500; // generous for gameplay still blocks automated attacks
const WINDOW_MS = 60 * 1000; // 1 minute

export function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // get identifier: token if authenticated, IP if not
  const token = req.headers.authorization?.replace("Bearer ", "");
  const identifier = token || (req.ip as string) || "unknown";

  const now = Date.now();
  const entry = store[identifier];

  if (!entry || now > entry.resetTime) {
    // new window
    store[identifier] = { count: 1, resetTime: now + WINDOW_MS };
    return next();
  }

  entry.count++;

  if (entry.count > MAX_REQUESTS) {
    res.status(429).json({
      error: "Too many requests. Try again later.",
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    });
    return;
  }

  res.set("X-RateLimit-Remaining", String(MAX_REQUESTS - entry.count));
  res.set("X-RateLimit-Reset", String(entry.resetTime));
  next();
}
