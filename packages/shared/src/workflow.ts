import { z } from "zod";
import { serviceCostCentsSchema } from "./tickets";

import { KB_BODY_MAX, kbTagsSchema } from "./knowledge";

export const forwardChannelSchema = z.enum(["EMAIL", "SMS"]);

export const NOTIFY_SUBJECT_MAX = 200;
export const NOTIFY_BODY_MAX = 5000;

export const forwardTicketSchema = z.strictObject({
  servicerId: z.string().min(1),
  channels: z
    .array(forwardChannelSchema)
    .min(1, "choose at least one channel")
    .max(2),
  subject: z.string().trim().min(1).max(NOTIFY_SUBJECT_MAX).optional(),
  body: z.string().trim().min(1).max(NOTIFY_BODY_MAX).optional(),
});
export type ForwardTicketInput = z.infer<typeof forwardTicketSchema>;

export const notifyReporterSchema = z.strictObject({
  subject: z.string().trim().min(1, "subject is required").max(NOTIFY_SUBJECT_MAX),
  body: z.string().trim().min(1, "body is required").max(NOTIFY_BODY_MAX),
});
export type NotifyReporterInput = z.infer<typeof notifyReporterSchema>;

export const RESOLUTION_MAX = KB_BODY_MAX;

export const closeTicketSchema = z.strictObject({
  resolution: z.string().trim().min(1, "resolution is required").max(RESOLUTION_MAX),
  addToKnowledgeBase: z.boolean().optional(),
  categoryId: z.string().min(1).nullable().optional(),
  tags: kbTagsSchema.optional(),
  serviceCostCents: serviceCostCentsSchema.nullable().optional(),
});
export type CloseTicketInput = z.infer<typeof closeTicketSchema>;
