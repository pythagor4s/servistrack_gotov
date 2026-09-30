import { Router } from "express";
import { z } from "zod";
import {
  ingestNotificationSchema,
  ingestTicketSchema,
  ingestStatusParamsSchema,
  ingestStatusQuerySchema,
  ingestUpdatesQuerySchema,
  type IngestStatusParams,
  type IngestStatusQuery,
  type IngestUpdatesQuery,
  type IngestNotificationInput,
  type IngestTicketInput,
} from "@servis-track/shared";
import { prisma } from "../db";
import { validate } from "../middleware/validate";
import { requireApiKey } from "../middleware/authenticate";
import { sendError } from "../middleware/errors";
import { chooseChannel } from "../notifications/routing";
import { deliverNotification, smsConfigured } from "../notifications/service";
import { resolveExternalCodes } from "../externalCodes";
import { notifyTicketCreated } from "../notifications/events";
import { publicStatus, publicStatusInclude } from "../ingestStatus";
import { Prisma } from "../generated/prisma/client";

export const ingestRouter = Router();

ingestRouter.post(
  "/tickets",
  requireApiKey,
  validate({ body: ingestTicketSchema }),
  async (req, res) => {
    const input = res.locals.valid.body as IngestTicketInput;
    const source = input.source ?? "ditrack";
    const byExternal = input.externalId
      ? { externalSource_externalId: { externalSource: source, externalId: input.externalId } }
      : null;

    if (byExternal) {
      const existing = await prisma.ticket.findUnique({ where: byExternal });
      if (existing) return res.status(200).json({ ...existing, duplicate: true, warnings: [] });
    }

    const codes = await resolveExternalCodes(input);
    const machineId = input.machineId ?? codes.machineId;
    const machine = input.machineId
      ? await prisma.machine.findUnique({
          where: { id: input.machineId },
          select: { departmentId: true },
        })
      : codes.machineId
        ? { departmentId: codes.machineDepartmentId ?? null }
        : null;
    const warnings = codes.unmapped.map(
      ({ field, code }) => `${field} "${code}" is not mapped yet - ticket created without it`,
    );
    if (warnings.length > 0) req.log.warn({ unmapped: codes.unmapped }, "ingest: unmapped external codes");

    const data = {
      title: input.title,
      type: input.type ?? (machineId ? "MACHINE" : "OTHER"),
      priority: input.priority,
      machineId,
      departmentId: machine ? machine.departmentId : (input.departmentId ?? codes.departmentId),
      faultDate: input.faultDate,
      reporterId: codes.reporter?.id,
      reporterName: input.reporterName ?? codes.reporter?.name,
      externalId: input.externalId,
      externalSource: input.externalId ? source : undefined,
      description: input.description,
      machineDown: input.machineDown,
      workOrderNo: input.workOrderNo,
      categoryId: input.categoryId ?? codes.categoryId,
      ...(Object.keys(codes.refs).length > 0 ? { externalRefs: codes.refs } : {}),
    } satisfies Prisma.TicketUncheckedCreateInput;

    let ticket;
    try {
      ticket = await prisma.ticket.create({ data });
    } catch (err) {
      if (byExternal && err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const existing = await prisma.ticket.findUnique({ where: byExternal });
        if (existing) return res.status(200).json({ ...existing, duplicate: true, warnings: [] });
      }
      throw err;
    }
    await prisma.ticketEvent.create({
      data: { ticketId: ticket.id, from: null, to: ticket.status, actorId: null },
    });
    notifyTicketCreated(ticket.id, null);
    res.status(201).json({ ...ticket, warnings });
  },
);

ingestRouter.post(
  "/notifications",
  requireApiKey,
  validate({ body: ingestNotificationSchema }),
  async (req, res) => {
    const input = res.locals.valid.body as IngestNotificationInput;

    let channel = input.channel;
    if (!channel) {
      const ticket = await prisma.ticket.findUnique({
        where: { id: input.ticketId },
        select: { priority: true },
      });
      if (!ticket) {
        return sendError(res, 400, "bad_reference", "Unknown ticketId");
      }
      channel = chooseChannel(ticket.priority, smsConfigured());
    }

    const notification = await prisma.notification.create({
      data: { ticketId: input.ticketId, channel, recipient: input.recipient },
    });

    res.status(202).json(notification);

    void deliverNotification(notification.id).catch((err) =>
      req.log.error(
        { err, notificationId: notification.id },
        "background delivery failed",
      ),
    );
  },
);

ingestRouter.get(
  "/tickets/:externalId",
  requireApiKey,
  validate({ params: ingestStatusParamsSchema, query: ingestStatusQuerySchema }),
  async (_req, res) => {
    const { externalId } = res.locals.valid.params as IngestStatusParams;
    const { source } = res.locals.valid.query as IngestStatusQuery;
    const ticket = await prisma.ticket.findUnique({
      where: { externalSource_externalId: { externalSource: source, externalId } },
      include: publicStatusInclude,
    });
    if (!ticket) return sendError(res, 404, "not_found", "Ticket not found");
    res.status(200).json(publicStatus(ticket));
  },
);

ingestRouter.get(
  "/tickets",
  requireApiKey,
  validate({ query: ingestUpdatesQuerySchema }),
  async (_req, res) => {
    const { source, updatedSince, limit } = res.locals.valid.query as IngestUpdatesQuery;
    const tickets = await prisma.ticket.findMany({
      where: { externalSource: source, externalId: { not: null }, updatedAt: { gt: updatedSince } },
      include: publicStatusInclude,
      orderBy: { updatedAt: "asc" },
      take: limit,
    });
    res.status(200).json(tickets.map(publicStatus));
  },
);

const dateAsString = (ctx: { zodSchema: unknown; jsonSchema: Record<string, unknown> }) => {
  const def = (ctx.zodSchema as { _zod?: { def?: { type?: string } } })._zod?.def;
  if (def?.type === "date") {
    ctx.jsonSchema.type = "string";
    ctx.jsonSchema.format = "date-time";
  }
};
ingestRouter.get("/schema", (_req, res) => {
  const opts = { io: "input", unrepresentable: "any", override: dateAsString } as const;
  res.status(200).json({
    ticket: z.toJSONSchema(ingestTicketSchema, opts),
    statusQuery: z.toJSONSchema(ingestStatusQuerySchema, opts),
    updatesQuery: z.toJSONSchema(ingestUpdatesQuerySchema, opts),
  });
});
