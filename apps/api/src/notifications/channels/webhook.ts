import type { NotificationChannel } from "@servis-track/shared";
import type { Channel, DeliveryResult, OutboundMessage } from "../channel";
import { logger } from "../../logger";
import { signBody, webhookSecretFor } from "../../ingestStatus";

const TIMEOUT_MS = 10_000;

export class WebhookChannel implements Channel {
  readonly channel: NotificationChannel = "WEBHOOK";

  async send(msg: OutboundMessage): Promise<DeliveryResult> {
    const secret = webhookSecretFor(msg.recipient);
    try {
      const res = await fetch(msg.recipient, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-servistrack-event": msg.subject,
          ...(secret ? { "x-servistrack-signature": `sha256=${signBody(secret, msg.body)}` } : {}),
        },
        body: msg.body,
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.status >= 200 && res.status < 300) {
        logger.info({ to: msg.recipient, status: res.status }, "webhook delivered");
        return { ok: true };
      }
      return { ok: false, error: `HTTP ${res.status}` };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
