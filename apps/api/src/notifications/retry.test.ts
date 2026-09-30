import { describe, it, expect } from "vitest";
import { runDelivery, type RetryStrategy } from "./retry";
import type { Channel, DeliveryResult, OutboundMessage } from "./channel";

const MSG: OutboundMessage = { recipient: "x", subject: "s", body: "b" };
const noSleep = async () => {};

function scriptedChannel(failTimes: number): Channel {
  let calls = 0;
  return {
    channel: "EMAIL",
    async send(): Promise<DeliveryResult> {
      calls++;
      return calls <= failTimes ? { ok: false, error: "boom" } : { ok: true };
    },
  };
}

const alwaysFail: Channel = {
  channel: "EMAIL",
  async send() {
    return { ok: false, error: "boom" };
  },
};

describe("runDelivery (retry engine)", () => {
  it("succeeds after k failures → DELIVERED with k+1 attempts", async () => {
    const strategy: RetryStrategy = { maxAttempts: 5, backoff: "fixed", baseDelayMs: 10 };
    const run = await runDelivery(scriptedChannel(2), MSG, strategy, { sleep: noSleep });
    expect(run.status).toBe("DELIVERED");
    expect(run.attempts).toHaveLength(3);
    expect(run.attempts.at(-1)?.outcome).toBe("SUCCESS");
  });

  it("all attempts fail → FAILED with maxAttempts attempts", async () => {
    const strategy: RetryStrategy = { maxAttempts: 3, backoff: "fixed", baseDelayMs: 10 };
    const run = await runDelivery(alwaysFail, MSG, strategy, { sleep: noSleep });
    expect(run.status).toBe("FAILED");
    expect(run.attempts).toHaveLength(3);
  });

  it("maxAttempts 1 → naive no-retry baseline (single attempt, no delay)", async () => {
    const strategy: RetryStrategy = { maxAttempts: 1, backoff: "fixed", baseDelayMs: 10 };
    const run = await runDelivery(alwaysFail, MSG, strategy, { sleep: noSleep });
    expect(run.attempts).toHaveLength(1);
    expect(run.totalDelayMs).toBe(0);
  });

  it("fixed backoff: totalDelay = base * (maxAttempts - 1)", async () => {
    const strategy: RetryStrategy = { maxAttempts: 3, backoff: "fixed", baseDelayMs: 100 };
    const run = await runDelivery(alwaysFail, MSG, strategy, { sleep: noSleep });
    expect(run.totalDelayMs).toBe(200);
  });

  it("exponential backoff: totalDelay doubles each retry", async () => {
    const strategy: RetryStrategy = { maxAttempts: 4, backoff: "exponential", baseDelayMs: 100 };
    const run = await runDelivery(alwaysFail, MSG, strategy, { sleep: noSleep });
    expect(run.totalDelayMs).toBe(700);
  });
});
