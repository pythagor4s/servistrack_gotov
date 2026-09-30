import type { RequestHandler } from "express";
import type { LoginInput } from "@servis-track/shared";
import { sendError } from "./errors";

export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

type Bucket = { failures: number; expiresAt: number };

export function createLoginLimiter(
  opts: { now?: () => number; maxFailures?: number; windowMs?: number } = {},
) {
  const now = opts.now ?? Date.now;
  const maxFailures = opts.maxFailures ?? LOGIN_MAX_FAILURES;
  const windowMs = opts.windowMs ?? LOGIN_WINDOW_MS;
  const buckets = new Map<string, Bucket>();

  function sweep(t: number) {
    if (buckets.size < 512) return;
    for (const [key, bucket] of buckets) {
      if (bucket.expiresAt <= t) buckets.delete(key);
    }
  }

  const middleware: RequestHandler = (_req, res, next) => {
    const { username } = res.locals.valid.body as LoginInput;
    const t = now();
    const bucket = buckets.get(username);

    if (!bucket || bucket.expiresAt <= t) {
      if (bucket) buckets.delete(username);
      return next();
    }
    if (bucket.failures < maxFailures) return next();

    res.setHeader("Retry-After", String(Math.ceil((bucket.expiresAt - t) / 1000)));
    return sendError(
      res,
      429,
      "too_many_requests",
      "Too many failed sign-in attempts. Try again later.",
    );
  };

  function recordFailure(username: string) {
    const t = now();
    sweep(t);
    const bucket = buckets.get(username);
    if (!bucket || bucket.expiresAt <= t) {
      buckets.set(username, { failures: 1, expiresAt: t + windowMs });
      return;
    }
    bucket.failures += 1;
  }

  function clearFailures(username: string) {
    buckets.delete(username);
  }

  function reset() {
    buckets.clear();
  }

  return { middleware, recordFailure, clearFailures, reset };
}

export const loginLimiter = createLoginLimiter();
