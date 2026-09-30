import { z } from "zod";

export const ticketStatusSchema = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "SERVICER_COMING",
  "RESOLVED",
]);
export const ticketPrioritySchema = z.enum(["NORMAL", "HIGH"]);
export const ticketTypeSchema = z.enum(["MACHINE", "SOFTWARE", "FACILITY", "OTHER"]);

export type TicketStatus = z.infer<typeof ticketStatusSchema>;
export type TicketPriority = z.infer<typeof ticketPrioritySchema>;
export type TicketType = z.infer<typeof ticketTypeSchema>;

const TITLE_MAX = 200;

export const createTicketSchema = z.strictObject({
  title: z.string().trim().min(1, "title is required").max(TITLE_MAX),
  type: ticketTypeSchema.optional(),
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  assigneeId: z.string().min(1).optional(),
  departmentId: z.string().min(1).optional(),
  machineId: z.string().min(1).optional(),
  faultDate: z.coerce.date().optional(),
  reporterName: z.string().trim().max(120).optional(),
  reporterId: z.string().min(1).optional(),
  machineDown: z.boolean().optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const TICKET_DESCRIPTION_MAX = 4000;
export const EXTERNAL_CODE_MAX = 64;
const externalCode = z.string().trim().min(1).max(EXTERNAL_CODE_MAX);
export const serviceCostCentsSchema = z.number().int().min(0).max(100_000_000);

export const ingestSourceSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{0,39}$/, "source must be a short slug (a-z, 0-9, -)");
const externalLabel = z.string().trim().min(1).max(200);

export const ingestTicketSchema = z.strictObject({
  title: z.string().trim().min(1, "title is required").max(TITLE_MAX),
  type: ticketTypeSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  departmentId: z.string().min(1).optional(),
  machineId: z.string().min(1).optional(),
  faultDate: z.coerce.date().optional(),
  reporterName: z.string().trim().max(120).optional(),
  externalId: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().min(1).max(TICKET_DESCRIPTION_MAX).optional(),
  categoryId: z.string().min(1).optional(),
  machineCode: externalCode.optional(),
  machineName: externalLabel.optional(),
  departmentCode: externalCode.optional(),
  departmentName: externalLabel.optional(),
  categoryCode: externalCode.optional(),
  categoryName: externalLabel.optional(),
  reporterWorkerNo: externalCode.optional(),
  source: ingestSourceSchema.optional(),
  machineDown: z.boolean().optional(),
  workOrderNo: externalCode.optional(),
});

export type IngestTicketInput = z.infer<typeof ingestTicketSchema>;

export const updateTicketSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(TITLE_MAX).optional(),
    type: ticketTypeSchema.optional(),
    status: ticketStatusSchema.optional(),
    priority: ticketPrioritySchema.optional(),
    assigneeId: z.string().min(1).nullable().optional(),
    departmentId: z.string().min(1).nullable().optional(),
    machineId: z.string().min(1).nullable().optional(),
    faultDate: z.coerce.date().nullable().optional(),
    reporterName: z.string().trim().max(120).nullable().optional(),
    assignedServicerId: z.string().min(1).nullable().optional(),
    categoryId: z.string().min(1).nullable().optional(),
    machineDown: z.boolean().optional(),
    workOrderNo: externalCode.nullable().optional(),
    servicerEta: z.coerce.date().nullable().optional(),
    serviceCostCents: serviceCostCentsSchema.nullable().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "at least one field must be provided",
  });

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

export const listTicketsQuerySchema = z.object({
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  type: ticketTypeSchema.optional(),
  assigneeId: z.string().min(1).optional(),
  departmentId: z.string().min(1).optional(),
  machineId: z.string().min(1).optional(),
  q: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;

export const idParamSchema = z.object({ id: z.string().min(1) });

export type IdParam = z.infer<typeof idParamSchema>;

export const attachmentParamsSchema = z.object({
  id: z.string().min(1),
  attachmentId: z.string().min(1),
});

export type AttachmentParams = z.infer<typeof attachmentParamsSchema>;

export const COMMENT_MAX = 2000;
export const createCommentSchema = z.strictObject({
  body: z.string().trim().min(1, "body is required").max(COMMENT_MAX),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const commentParamsSchema = z.object({
  id: z.string().min(1),
  commentId: z.string().min(1),
});
export type CommentParams = z.infer<typeof commentParamsSchema>;

export const ingestStatusParamsSchema = z.object({
  externalId: z.string().trim().min(1).max(100),
});
export const ingestStatusQuerySchema = z.object({
  source: ingestSourceSchema.default("ditrack"),
});
export const ingestUpdatesQuerySchema = z.object({
  source: ingestSourceSchema.default("ditrack"),
  updatedSince: z.coerce.date(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});
export type IngestStatusParams = z.infer<typeof ingestStatusParamsSchema>;
export type IngestStatusQuery = z.infer<typeof ingestStatusQuerySchema>;
export type IngestUpdatesQuery = z.infer<typeof ingestUpdatesQuerySchema>;
