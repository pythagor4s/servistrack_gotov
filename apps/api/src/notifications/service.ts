import type { NotificationChannel } from "@servis-track/shared";
import { prisma } from "../db";
import { logger } from "../logger";
import type { Channel, DeliveryResult, OutboundMessage } from "./channel";
import { EmailChannel } from "./channels/email";
import { WebhookChannel } from "./channels/webhook";
import { runDelivery, type RetryStrategy } from "./retry";

function defaultStrategy(): RetryStrategy {
  return {
    maxAttempts: Number(process.env.NOTIFY_MAX_ATTEMPTS || 3),
    backoff: process.env.NOTIFY_BACKOFF === "fixed" ? "fixed" : "exponential",
    baseDelayMs: Number(process.env.NOTIFY_BASE_DELAY_MS || 300),
  };
}

class SmsStubChannel implements Channel {
  readonly channel: NotificationChannel = "SMS";
  async send(msg: OutboundMessage): Promise<DeliveryResult> {
    logger.warn({ to: msg.recipient }, "SMS: no provider configured, reporting failure");
    return { ok: false, error: "SMS ponudnik ni nastavljen" };
  }
}

export function smsConfigured(): boolean {
  return false;
}

export function resolveChannel(channel: NotificationChannel): Channel {
  switch (channel) {
    case "EMAIL":
      return new EmailChannel();
    case "SMS":
      return new SmsStubChannel();
    case "WEBHOOK":
      return new WebhookChannel();
  }
}

function buildMessage(
  recipient: string,
  ticket: { id: string; title: string; priority: string; status: string },
): OutboundMessage {
  return {
    recipient,
    subject: `[ServisTrack] Ticket ${ticket.id}: ${ticket.title}`,
    body:
      `Priority: ${ticket.priority} | Status: ${ticket.status}\n\n` +
      `${ticket.title}\n\n(Ticket ${ticket.id})`,
  };
}

export async function deliverNotification(
  notificationId: string,
  opts: { strategy?: RetryStrategy } = {},
): Promise<void> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: { ticket: true },
  });
  if (!notification) {
    logger.warn({ notificationId }, "deliver: notification not found");
    return;
  }
  if (notification.status === "DELIVERED") {
    logger.info({ notificationId }, "deliver: already delivered, skipping");
    return;
  }

  let channel: Channel;
  try {
    channel = resolveChannel(notification.channel);
  } catch (err) {
    logger.error(
      { err, notificationId, channel: notification.channel },
      "deliver: unsupported channel",
    );
    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: "FAILED" },
    });
    return;
  }

  const strategy = opts.strategy ?? defaultStrategy();
  const composed = buildMessage(notification.recipient, notification.ticket);
  const msg: OutboundMessage = {
    recipient: notification.recipient,
    subject: notification.subject ?? composed.subject,
    body: notification.body ?? composed.body,
  };
  const run = await runDelivery(channel, msg, strategy);

  for (const attempt of run.attempts) {
    await prisma.deliveryAttempt.upsert({
      where: {
        notificationId_attemptNumber: {
          notificationId,
          attemptNumber: attempt.attemptNumber,
        },
      },
      create: {
        notificationId,
        attemptNumber: attempt.attemptNumber,
        outcome: attempt.outcome,
        error: attempt.error,
        durationMs: attempt.durationMs,
      },
      update: {},
    });
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { status: run.status, attempts: run.attempts.length },
  });

  logger.info(
    {
      notificationId,
      channel: notification.channel,
      status: run.status,
      attempts: run.attempts.length,
      totalDelayMs: run.totalDelayMs,
    },
    "deliver: done",
  );
}
