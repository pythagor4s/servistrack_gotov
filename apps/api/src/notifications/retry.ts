import type { Channel, OutboundMessage } from "./channel";

export type BackoffKind = "fixed" | "exponential";

export type RetryStrategy = {
  maxAttempts: number;
  backoff: BackoffKind;
  baseDelayMs: number;
};

export type AttemptLog = {
  attemptNumber: number;
  outcome: "SUCCESS" | "FAILURE";
  error?: string;
  durationMs: number;
  delayBeforeMs: number;
};

export type RetryRun = {
  status: "DELIVERED" | "FAILED";
  attempts: AttemptLog[];
  totalDelayMs: number;
};

const realSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function backoffDelay(strategy: RetryStrategy, attemptNumber: number): number {
  if (attemptNumber <= 1) return 0;
  const retryIndex = attemptNumber - 2;
  return strategy.backoff === "exponential"
    ? strategy.baseDelayMs * 2 ** retryIndex
    : strategy.baseDelayMs;
}

export async function runDelivery(
  channel: Channel,
  msg: OutboundMessage,
  strategy: RetryStrategy,
  opts: { sleep?: (ms: number) => Promise<void> } = {},
): Promise<RetryRun> {
  const sleep = opts.sleep ?? realSleep;
  const attempts: AttemptLog[] = [];
  let totalDelayMs = 0;

  for (let n = 1; n <= strategy.maxAttempts; n++) {
    const delayBeforeMs = backoffDelay(strategy, n);
    if (delayBeforeMs > 0) {
      totalDelayMs += delayBeforeMs;
      await sleep(delayBeforeMs);
    }

    const started = Date.now();
    const result = await channel.send(msg);
    const durationMs = Date.now() - started;

    if (result.ok) {
      attempts.push({ attemptNumber: n, outcome: "SUCCESS", durationMs, delayBeforeMs });
      return { status: "DELIVERED", attempts, totalDelayMs };
    }
    attempts.push({
      attemptNumber: n,
      outcome: "FAILURE",
      error: result.error,
      durationMs,
      delayBeforeMs,
    });
  }

  return { status: "FAILED", attempts, totalDelayMs };
}
