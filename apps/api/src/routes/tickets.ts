import { Router, type RequestHandler } from "express";
import multer from "multer";
import {
  createTicketSchema,
  updateTicketSchema,
  listTicketsQuerySchema,
  idParamSchema,
  attachmentParamsSchema,
  forwardTicketSchema,
  closeTicketSchema,
  notifyReporterSchema,
  type NotifyReporterInput,
  createCommentSchema,
  commentParamsSchema,
  type CreateCommentInput,
  type CommentParams,
  type CreateTicketInput,
  type UpdateTicketInput,
  type ListTicketsQuery,
  type IdParam,
  type AttachmentParams,
  type ForwardTicketInput,
  type CloseTicketInput,
} from "@servis-track/shared";
import { prisma } from "../db";
import { Prisma, type TicketStatus } from "../generated/prisma/client";
import { validate } from "../middleware/validate";
import { sendError } from "../middleware/errors";
import { requireRole, type AuthedUser } from "../middleware/authenticate";
import { deliverNotification, smsConfigured } from "../notifications/service";
import {
  notifyComment,
  notifyReporterManually,
  notifyStatusChange,
  notifyTicketCreated,
} from "../notifications/events";
import { invalidateKnowledgeIndex } from "../search/store";

export const ticketsRouter = Router();

const denyWorkerWorkflowFields: RequestHandler = (_req, res, next) => {
  const user = res.locals.user as AuthedUser | undefined;
  const body = res.locals.valid?.body as Record<string, unknown> | undefined;
  if (
    user?.role === "TECHNICIAN" &&
    body &&
    ("status" in body ||
      "assigneeId" in body ||
      "assignedServicerId" in body ||
      "servicerEta" in body ||
      "serviceCostCents" in body)
  ) {
    return sendError(
      res,
      403,
      "forbidden",
      "Only an admin can change status, assignee or servicer",
    );
  }
  next();
};

const publicUserSelect = {
  select: {
    id: true,
    username: true,
    name: true,
    role: true,
    phone: true,
    active: true,
    image: { select: { updatedAt: true } },
  },
} as const;

const ticketDetailInclude = {
  assignee: publicUserSelect,
  reporter: { select: { ...publicUserSelect.select, email: true, notifyEmail: true } },
  department: true,
  machine: { include: { department: true, image: { select: { updatedAt: true } } } },
  assignedServicer: true,
  category: true,
  attachments: {
    select: { id: true, filename: true, mimeType: true, size: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  },
  notifications: {
    include: { deliveryAttempts: { orderBy: { attemptNumber: "asc" } } },
    orderBy: { createdAt: "desc" },
  },
  comments: {
    include: { author: publicUserSelect },
    orderBy: { createdAt: "asc" },
  },
  events: {
    include: { actor: { select: { id: true, username: true, name: true } } },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.TicketInclude;

function statusEvent(
  ticketId: string,
  from: TicketStatus | null,
  to: TicketStatus | undefined,
  actorId: string | null,
) {
  if (!to || to === from) return null;
  return prisma.ticketEvent.create({ data: { ticketId, from, to, actorId } });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const PDF_MAGIC = "%PDF-";

export function decodeOriginalName(name: string): string {
  const bytes = Buffer.from(name, "latin1");
  const utf8 = bytes.toString("utf8");
  return Buffer.from(utf8, "utf8").equals(bytes) ? utf8 : name;
}

export function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function departmentOfMachine(
  machineId: string | null | undefined,
): Promise<string | null | undefined> {
  if (!machineId) return undefined;
  const machine = await prisma.machine.findUnique({
    where: { id: machineId },
    select: { departmentId: true },
  });
  return machine ? machine.departmentId : undefined;
}

ticketsRouter.post(
  "/",
  validate({ body: createTicketSchema }),
  denyWorkerWorkflowFields,
  async (_req, res) => {
    const input = res.locals.valid.body as CreateTicketInput;
    const user = res.locals.user as AuthedUser;
    const derived = await departmentOfMachine(input.machineId);
    const data = {
      ...input,
      ...(derived !== undefined ? { departmentId: derived } : {}),
      ...(user.role === "TECHNICIAN" ? { reporterId: user.id } : {}),
    };
    const ticket = await prisma.ticket.create({ data });
    await prisma.ticketEvent.create({
      data: { ticketId: ticket.id, from: null, to: ticket.status, actorId: user.id },
    });
    notifyTicketCreated(ticket.id, user.id);
    res.status(201).json(ticket);
  },
);

ticketsRouter.get(
  "/",
  validate({ query: listTicketsQuerySchema }),
  async (_req, res) => {
    const { status, priority, type, assigneeId, departmentId, machineId, q, limit, offset } =
      res.locals.valid.query as ListTicketsQuery;
    const user = res.locals.user as AuthedUser;
    const ownership =
      user.role === "TECHNICIAN" ? { reporterId: user.id } : {};
    const where: Prisma.TicketWhereInput = {
      status,
      priority,
      type,
      assigneeId,
      departmentId,
      machineId,
      ...ownership,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { resolution: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          assignee: publicUserSelect,
          reporter: publicUserSelect,
          department: true,
          machine: { include: { department: true, image: { select: { updatedAt: true } } } },
          assignedServicer: true,
          category: true,
        },
        orderBy: [{ status: "asc" }, { machineDown: "desc" }, { priority: "desc" }, { createdAt: "desc" }],
        take: limit,
        skip: offset,
      }),
      prisma.ticket.count({ where }),
    ]);
    res.setHeader("X-Total-Count", String(total));
    res.status(200).json(tickets);
  },
);

ticketsRouter.get(
  "/:id",
  validate({ params: idParamSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: ticketDetailInclude,
    });
    if (!ticket) return sendError(res, 404, "not_found", "Ticket not found");
    const user = res.locals.user as AuthedUser;
    if (user.role === "TECHNICIAN" && ticket.reporterId !== user.id) {
      return sendError(res, 404, "not_found", "Ticket not found");
    }
    res.status(200).json(ticket);
  },
);

ticketsRouter.patch(
  "/:id",
  validate({ params: idParamSchema, body: updateTicketSchema }),
  denyWorkerWorkflowFields,
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const input = res.locals.valid.body as UpdateTicketInput;

    const existing = await prisma.ticket.findUnique({ where: { id } });
    if (!existing) return sendError(res, 404, "not_found", "Ticket not found");
    const user = res.locals.user as AuthedUser;
    if (user.role === "TECHNICIAN" && existing.reporterId !== user.id) {
      return sendError(res, 404, "not_found", "Ticket not found");
    }

    const status =
      input.status ??
      (input.servicerEta && existing.status !== "RESOLVED" && existing.status !== "SERVICER_COMING"
        ? ("SERVICER_COMING" as const)
        : undefined);
    const withStatus = status ? { ...input, status } : input;

    const withResolved =
      withStatus.status === "RESOLVED"
        ? { ...withStatus, resolvedAt: new Date() }
        : withStatus.status
          ? { ...withStatus, resolvedAt: null }
          : withStatus;
    const derived = await departmentOfMachine(input.machineId);
    const data =
      derived !== undefined ? { ...withResolved, departmentId: derived } : withResolved;

    const event = statusEvent(id, existing.status, status, user.id);
    const update = prisma.ticket.update({
      where: { id },
      data,
      include: ticketDetailInclude,
    });
    let ticket;
    if (event) {
      const [updated, created] = await prisma.$transaction([update, event]);
      ticket = updated;
      notifyStatusChange(id, created.id);
    } else {
      ticket = await update;
    }
    res.status(200).json(ticket);
  },
);

ticketsRouter.post(
  "/:id/forward",
  requireRole("ADMIN"),
  validate({ params: idParamSchema, body: forwardTicketSchema }),
  async (req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const input = res.locals.valid.body as ForwardTicketInput;

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return sendError(res, 404, "not_found", "Ticket not found");
    const servicer = await prisma.servicer.findUnique({
      where: { id: input.servicerId },
    });
    if (!servicer) return sendError(res, 400, "bad_reference", "Unknown servicerId");

    const updated = await prisma.ticket.update({
      where: { id },
      data: { assignedServicerId: servicer.id },
      include: ticketDetailInclude,
    });

    const smsFallback = input.channels.includes("SMS") && !smsConfigured();
    const channels = [
      ...new Set(input.channels.map((c) => (c === "SMS" && smsFallback ? "EMAIL" : c))),
    ];
    const notifications = [];
    for (const channel of channels) {
      const recipient =
        channel === "SMS" ? (servicer.phone ?? servicer.email) : servicer.email;
      const subject = channel === "SMS" ? null : (input.subject ?? null);
      const body = input.body ?? null;
      const notification = await prisma.notification.upsert({
        where: { ticketId_channel_key: { ticketId: id, channel, key: "servicer" } },
        create: { ticketId: id, channel, recipient, subject, body },
        update: { recipient, status: "PENDING", subject, body },
      });
      notifications.push(notification);
    }

    res.status(202).json({ ticket: updated, notifications, smsFallback });
    for (const n of notifications) {
      void deliverNotification(n.id).catch((err) =>
        req.log.error({ err, notificationId: n.id }, "forward delivery failed"),
      );
    }
  },
);

ticketsRouter.post(
  "/:id/notify-reporter",
  requireRole("ADMIN"),
  validate({ params: idParamSchema, body: notifyReporterSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const { subject, body } = res.locals.valid.body as NotifyReporterInput;
    const exists = await prisma.ticket.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return sendError(res, 404, "not_found", "Ticket not found");
    const problem = await notifyReporterManually(id, subject, body);
    if (problem) return sendError(res, 409, "conflict", problem);
    res.status(202).json({ ok: true });
  },
);

ticketsRouter.post(
  "/:id/close",
  requireRole("ADMIN"),
  validate({ params: idParamSchema, body: closeTicketSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const input = res.locals.valid.body as CloseTicketInput;

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return sendError(res, 404, "not_found", "Ticket not found");

    const user = res.locals.user as AuthedUser;
    const event = statusEvent(id, ticket.status, "RESOLVED", user.id);
    const update = prisma.ticket.update({
      where: { id },
      data: {
        status: "RESOLVED",
        resolution: input.resolution,
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.serviceCostCents !== undefined ? { serviceCostCents: input.serviceCostCents } : {}),
        resolvedAt: ticket.status === "RESOLVED" && ticket.resolvedAt ? ticket.resolvedAt : new Date(),
      },
      include: ticketDetailInclude,
    });
    let updated;
    if (event) {
      const [row, created] = await prisma.$transaction([update, event]);
      updated = row;
      notifyStatusChange(id, created.id);
    } else {
      updated = await update;
    }

    if (input.addToKnowledgeBase) {
      const existingArticle = await prisma.knowledgeArticle.findFirst({
        where: { ticketId: ticket.id },
      });
      const classification = {
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
      };
      if (existingArticle) {
        await prisma.knowledgeArticle.update({
          where: { id: existingArticle.id },
          data: {
            title: ticket.title,
            body: input.resolution,
            type: ticket.type,
            machineId: ticket.machineId,
            departmentId: ticket.departmentId,
            published: true,
            ...classification,
          },
        });
      } else {
        await prisma.knowledgeArticle.create({
          data: {
            title: ticket.title,
            body: input.resolution,
            type: ticket.type,
            machineId: ticket.machineId,
            departmentId: ticket.departmentId,
            ticketId: ticket.id,
            published: true,
            ...classification,
          },
        });
      }
    }
    invalidateKnowledgeIndex();
    res.status(200).json(updated);
  },
);

ticketsRouter.post(
  "/:id/comments",
  validate({ params: idParamSchema, body: createCommentSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const { body } = res.locals.valid.body as CreateCommentInput;
    const user = res.locals.user as AuthedUser;
    const ticket = await prisma.ticket.findUnique({ where: { id }, select: { reporterId: true } });
    if (!ticket || (user.role === "TECHNICIAN" && ticket.reporterId !== user.id)) {
      return sendError(res, 404, "not_found", "Ticket not found");
    }
    const comment = await prisma.ticketComment.create({
      data: { ticketId: id, authorId: user.id, body },
      include: { author: publicUserSelect },
    });
    notifyComment(comment.id);
    res.status(201).json(comment);
  },
);

ticketsRouter.delete(
  "/:id/comments/:commentId",
  validate({ params: commentParamsSchema }),
  async (_req, res) => {
    const { id, commentId } = res.locals.valid.params as CommentParams;
    const user = res.locals.user as AuthedUser;
    const comment = await prisma.ticketComment.findFirst({ where: { id: commentId, ticketId: id } });
    if (!comment) return sendError(res, 404, "not_found", "Comment not found");
    if (user.role !== "ADMIN" && comment.authorId !== user.id) {
      return sendError(res, 403, "forbidden", "Only the author or an admin can delete a comment");
    }
    await prisma.ticketComment.delete({ where: { id: comment.id } });
    res.status(204).end();
  },
);

ticketsRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  validate({ params: idParamSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const existing = await prisma.ticket.findUnique({ where: { id } });
    if (!existing) return sendError(res, 404, "not_found", "Ticket not found");
    await prisma.ticket.delete({ where: { id } });
    invalidateKnowledgeIndex();
    res.status(204).end();
  },
);

ticketsRouter.post(
  "/:id/attachments",
  requireRole("ADMIN"),
  validate({ params: idParamSchema }),
  upload.single("file"),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const file = _req.file;
    if (!file) return sendError(res, 400, "validation_error", "No file uploaded (field 'file')");
    const looksLikePdf = file.buffer.subarray(0, PDF_MAGIC.length).toString("latin1") === PDF_MAGIC;
    if (file.mimetype !== "application/pdf" || !looksLikePdf) {
      return sendError(res, 400, "validation_error", "Only PDF files are allowed");
    }
    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return sendError(res, 404, "not_found", "Ticket not found");

    const att = await prisma.ticketAttachment.create({
      data: {
        ticketId: id,
        filename: decodeOriginalName(file.originalname),
        mimeType: file.mimetype,
        size: file.size,
        data: new Uint8Array(file.buffer),
      },
    });
    res.status(201).json({
      id: att.id,
      filename: att.filename,
      mimeType: att.mimeType,
      size: att.size,
      createdAt: att.createdAt,
    });
  },
);

async function canReadTicket(user: AuthedUser, ticketId: string): Promise<boolean> {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { reporterId: true } });
  if (!ticket) return false;
  return user.role === "ADMIN" || ticket.reporterId === user.id;
}

ticketsRouter.get(
  "/:id/attachments",
  validate({ params: idParamSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    if (!(await canReadTicket(res.locals.user as AuthedUser, id))) {
      return sendError(res, 404, "not_found", "Ticket not found");
    }
    const attachments = await prisma.ticketAttachment.findMany({
      where: { ticketId: id },
      select: { id: true, filename: true, mimeType: true, size: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(attachments);
  },
);

ticketsRouter.get(
  "/:id/attachments/:attachmentId/download",
  validate({ params: attachmentParamsSchema }),
  async (_req, res) => {
    const { id, attachmentId } = res.locals.valid.params as AttachmentParams;
    if (!(await canReadTicket(res.locals.user as AuthedUser, id))) {
      return sendError(res, 404, "not_found", "Attachment not found");
    }
    const att = await prisma.ticketAttachment.findFirst({
      where: { id: attachmentId, ticketId: id },
    });
    if (!att) return sendError(res, 404, "not_found", "Attachment not found");
    res.setHeader("Content-Type", att.mimeType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", contentDisposition(att.filename));
    res.send(Buffer.from(att.data));
  },
);

ticketsRouter.delete(
  "/:id/attachments/:attachmentId",
  requireRole("ADMIN"),
  validate({ params: attachmentParamsSchema }),
  async (_req, res) => {
    const { id, attachmentId } = res.locals.valid.params as AttachmentParams;
    const att = await prisma.ticketAttachment.findFirst({
      where: { id: attachmentId, ticketId: id },
    });
    if (!att) return sendError(res, 404, "not_found", "Attachment not found");
    await prisma.ticketAttachment.delete({ where: { id: att.id } });
    res.status(204).end();
  },
);
