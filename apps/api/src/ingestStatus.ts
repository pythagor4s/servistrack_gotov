import { createHmac } from "node:crypto";
import type { Prisma } from "./generated/prisma/client";

export const STATUS_LABEL_SL: Record<string, string> = {
  OPEN: "Odprto",
  IN_PROGRESS: "V reševanju",
  SERVICER_COMING: "Serviser prihaja",
  RESOLVED: "Rešeno",
};

export const publicStatusInclude = {
  assignedServicer: { select: { name: true } },
} satisfies Prisma.TicketInclude;

type TicketForStatus = Prisma.TicketGetPayload<{ include: typeof publicStatusInclude }>;

export function publicStatus(t: TicketForStatus) {
  return {
    id: t.id,
    number: t.number,
    source: t.externalSource,
    externalId: t.externalId,
    status: t.status,
    statusLabel: STATUS_LABEL_SL[t.status] ?? t.status,
    machineDown: t.machineDown,
    servicerName: t.assignedServicer?.name ?? null,
    servicerEta: t.servicerEta,
    resolution: t.resolution,
    resolvedAt: t.resolvedAt,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

function envKey(source: string): string {
  return source.toUpperCase().replace(/[^A-Z0-9]/g, "_");
}

export function webhookUrlFor(source: string | null): string | null {
  if (!source) return null;
  return process.env[`WEBHOOK_URL_${envKey(source)}`] || null;
}

export function webhookSecretFor(url: string): string | null {
  for (const [name, value] of Object.entries(process.env)) {
    if (name.startsWith("WEBHOOK_URL_") && value === url) {
      return process.env[`WEBHOOK_SECRET_${name.slice("WEBHOOK_URL_".length)}`] || null;
    }
  }
  return null;
}

export function signBody(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}
