import type { NotificationChannel } from "@servis-track/shared";

export type DeliveryResult = { ok: true } | { ok: false; error: string };

export type OutboundMessage = {
  recipient: string;
  subject: string;
  body: string;
};

export interface Channel {
  readonly channel: NotificationChannel;
  send(msg: OutboundMessage): Promise<DeliveryResult>;
}
