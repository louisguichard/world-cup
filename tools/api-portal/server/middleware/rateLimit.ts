import type { Request, Response, NextFunction } from "express";

type Bucket = { count: number; resetAt: number };

function createRateLimiter(maxPerMinute: number) {
  const buckets = new Map<string, Bucket>();

  return function rateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const ip = req.ip ?? "unknown";
    const now = Date.now();
    const bucket = buckets.get(ip);

    if (!bucket || now >= bucket.resetAt) {
      buckets.set(ip, { count: 1, resetAt: now + 60_000 });
      next();
      return;
    }

    if (bucket.count >= maxPerMinute) {
      res.status(429).json({ error: "Rate limit exceeded. Try again in a minute." });
      return;
    }

    bucket.count++;
    next();
  };
}

export const globalRateLimit = createRateLimiter(100);
export const revealRateLimit = createRateLimiter(10);
