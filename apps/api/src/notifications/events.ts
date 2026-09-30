import type { NotificationAudience, NotificationChannel } from "../generated/prisma/client";
import { publicStatus, publicStatusInclude, webhookUrlFor } from "../ingestStatus";
import { prisma } from "../db";
import { logger } from "../logger";
import { deliverNotification } from "./service";

type Recipient = { id: string; email: string };

const recipientSelect = { id: true, email: true, active: true, notifyEmail: true } as const;

function reachable(u: { email: string | null; active: boolean; notifyEmail: boolean } | null): u is {
  id: string;
  email: string;
  active: boolean;
  notifyEmail: boolean;
} {
  return Boolean(u && u.email && u.active && u.notifyEmail);
}

async function admins(exceptId: string | null): Promise<Recipient[]> {
  const rows = await prisma.user.findMany({
    where: { role: "ADMIN", active: true, notifyEmail: true, email: { not: null } },
    select: recipientSelect,
  });
  return rows.filter((u) => u.id !== exceptId && reachable(u)) as Recipient[];
}

function link(ticketId: string): string {
  const base = process.env.APP_URL?.replace(/\/+$/, "");
  return base ? `\n\nOdpri ticket: ${base}/zahtevki/${ticketId}` : "";
}

async function enqueue(
  ticketId: string,
  audience: NotificationAudience,
  key: string,
  recipient: string,
  subject: string,
  body: string,
  channel: NotificationChannel = "EMAIL",
): Promise<void> {
  const n = await prisma.notification.upsert({
    where: { ticketId_channel_key: { ticketId, channel, key } },
    create: { ticketId, channel, key, audience, recipient, subject, body },
    update: {},
  });
  void deliverNotification(n.id).catch((err) =>
    logger.error({ err, notificationId: n.id }, "event notification delivery failed"),
  );
}

function safe(what: string, fn: () => Promise<void>): void {
  void fn().catch((err) => logger.error({ err }, `notify ${what} failed`));
}

const ticketForMessage = {
  include: {
    machine: { select: { brand: true, model: true } },
    department: { select: { name: true } },
    reporter: { select: { ...recipientSelect, name: true, username: true } },
    assignedServicer: { select: { name: true } },
  },
} as const;

function where(t: { machine: { brand: string; model: string } | null; department: { name: string } | null }): string {
  if (t.machine) return `${t.machine.brand} ${t.machine.model}${t.department ? ` (${t.department.name})` : ""}`;
  return t.department?.name ?? "—";
}

export function notifyTicketCreated(ticketId: string, actorId: string | null): void {
  safe("ticket created", async () => {
    const t = await prisma.ticket.findUnique({ where: { id: ticketId }, ...ticketForMessage });
    if (!t) return;
    const to = await admins(actorId);
    const urgent = t.machineDown ? "STROJ STOJI: " : t.priority === "HIGH" ? "NUJNO: " : "";
    const who = t.reporter?.name ?? t.reporter?.username ?? t.reporterName ?? "—";
    const subject = `[ServisTrack] ${urgent}Nov ticket #${t.number}: ${t.title}`;
    const body =
      `${urgent}Nova prijava napake #${t.number}.\n\n` +
      `${t.title}\n` +
      (t.description ? `\n${t.description}\n` : "") +
      `\nKje: ${where(t)}\nPrijavil: ${who}` +
      (t.workOrderNo ? `\nDelovni nalog: ${t.workOrderNo}` : "") +
      (t.externalId ? `\nDiTrack: ${t.externalId}` : "") +
      link(t.id);
    for (const r of to) await enqueue(t.id, "STAFF", `new:${r.id}`, r.email, subject, body);
  });
}

async function webhookStatus(ticketId: string, eventId: string, occurredAt: Date): Promise<void> {
  const t = await prisma.ticket.findUnique({ where: { id: ticketId }, include: publicStatusInclude });
  const url = webhookUrlFor(t?.externalSource ?? null);
  if (!t || !url) return;
  const body = JSON.stringify({
    event: "ticket.status",
    eventId,
    occurredAt: occurredAt.toISOString(),
    ticket: publicStatus(t),
  });
  await enqueue(t.id, "SYSTEM", `status:${eventId}`, url, "ticket.status", body, "WEBHOOK");
}

export function notifyStatusChange(ticketId: string, eventId: string): void {
  safe("status webhook", async () => {
    const event = await prisma.ticketEvent.findUnique({ where: { id: eventId } });
    if (event) await webhookStatus(ticketId, eventId, event.createdAt);
  });
}

export async function notifyReporterManually(
  ticketId: string,
  subject: string,
  body: string,
): Promise<string | null> {
  const t = await prisma.ticket.findUnique({ where: { id: ticketId }, ...ticketForMessage });
  if (!t) return "Ticket ne obstaja.";
  const r = t.reporter;
  if (!r) return "Prijavitelj nima računa v ServisTracku (prijava iz DiTracka brez povezanega delavca).";
  if (!r.email) return "Prijavitelj v profilu nima e-pošte.";
  if (!r.active) return "Račun prijavitelja je deaktiviran.";
  if (!r.notifyEmail) return "Prijavitelj je v nastavitvah izklopil obvestila po e-pošti.";
  const key = `manual:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await enqueue(t.id, "REPORTER", key, r.email, subject, body);
  return null;
}

export function notifyComment(commentId: string): void {
  safe("comment", async () => {
    const c = await prisma.ticketComment.findUnique({
      where: { id: commentId },
      include: { author: { select: { id: true, name: true, username: true } } },
    });
    if (!c) return;
    const t = await prisma.ticket.findUnique({ where: { id: c.ticketId }, ...ticketForMessage });
    if (!t || c.authorId === null || c.authorId !== t.reporterId) return;
    const authorName = c.author?.name ?? c.author?.username ?? "Prijavitelj";
    const subject = `[ServisTrack] Komentar na ticket #${t.number}: ${t.title}`;
    const body = `Nov komentar pri ticketu #${t.number} (${authorName}):\n\n${c.body}` + link(t.id);
    for (const r of await admins(c.authorId)) {
      await enqueue(t.id, "STAFF", `comment:${c.id}:${r.id}`, r.email, subject, body);
    }
  });
}
