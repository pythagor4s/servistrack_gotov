import nodemailer, { type Transporter } from "nodemailer";
import type { NotificationChannel } from "@servis-track/shared";
import type { Channel, DeliveryResult, OutboundMessage } from "../channel";
import { logger } from "../../logger";

let transporter: Transporter | null = null;

export function emailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

export function mailFrom(): string {
  return process.env.MAIL_FROM || process.env.SMTP_USER || "ServisTrack <no-reply@servistrack.local>";
}

function getTransporter(): Transporter {
  if (transporter) return transporter;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: user && pass ? { user, pass } : undefined,
    tls: { rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false" },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
  });
  return transporter;
}

export async function verifySmtp(): Promise<string | null> {
  if (!emailConfigured()) return "SMTP ni nastavljen (SMTP_HOST)";
  try {
    await getTransporter().verify();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

export class EmailChannel implements Channel {
  readonly channel: NotificationChannel = "EMAIL";

  async send(msg: OutboundMessage): Promise<DeliveryResult> {
    if (!emailConfigured()) return { ok: false, error: "SMTP ni nastavljen (SMTP_HOST)" };
    try {
      const info = await getTransporter().sendMail({
        from: mailFrom(),
        to: msg.recipient,
        subject: msg.subject,
        text: msg.body,
      });
      const preview = nodemailer.getTestMessageUrl(info);
      logger.info(
        { messageId: info.messageId, to: msg.recipient, ...(preview ? { preview } : {}) },
        "email sent",
      );
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
