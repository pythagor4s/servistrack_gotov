import { z } from "zod";

import { ticketTypeSchema } from "./tickets";

export const searchKnowledgeQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  machineId: z.string().min(1).optional(),
  departmentId: z.string().min(1).optional(),
  type: ticketTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type SearchKnowledgeQuery = z.infer<typeof searchKnowledgeQuerySchema>;

export const KB_TITLE_MAX = 200;
export const KB_BODY_MAX = 5000;

export const KB_TAG_MAX = 40;
export const KB_TAGS_MAX = 12;
export const kbTagsSchema = z
  .array(z.string().trim().min(1).max(KB_TAG_MAX))
  .max(KB_TAGS_MAX)
  .transform((tags) => [...new Set(tags.map((t) => t.toLowerCase()))]);

export const createKnowledgeSchema = z.strictObject({
  title: z.string().trim().min(1, "title is required").max(KB_TITLE_MAX),
  body: z.string().trim().min(1, "body is required").max(KB_BODY_MAX),
  type: ticketTypeSchema.default("OTHER"),
  machineId: z.string().min(1).nullable().optional(),
  departmentId: z.string().min(1).nullable().optional(),
  categoryId: z.string().min(1).nullable().optional(),
  tags: kbTagsSchema.optional(),
});
export type CreateKnowledgeInput = z.infer<typeof createKnowledgeSchema>;

export const updateKnowledgeSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(KB_TITLE_MAX).optional(),
    body: z.string().trim().min(1).max(KB_BODY_MAX).optional(),
    type: ticketTypeSchema.optional(),
    machineId: z.string().min(1).nullable().optional(),
    departmentId: z.string().min(1).nullable().optional(),
    categoryId: z.string().min(1).nullable().optional(),
    tags: kbTagsSchema.optional(),
    pinned: z.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "at least one field must be provided",
  });
export type UpdateKnowledgeInput = z.infer<typeof updateKnowledgeSchema>;

export const KB_SORTS = ["relevance", "recent", "oldest", "views", "helpful", "az"] as const;
export const kbSortSchema = z.enum(KB_SORTS);
export type KbSort = z.infer<typeof kbSortSchema>;

export const kbSourceSchema = z.enum(["ticket", "manual"]);

export const KB_QUERY_MAX = 500;

export const kbSearchQuerySchema = z.object({
  q: z.string().trim().max(KB_QUERY_MAX).optional(),
  categoryId: z.string().min(1).optional(),
  type: ticketTypeSchema.optional(),
  departmentId: z.string().min(1).optional(),
  machineId: z.string().min(1).optional(),
  source: kbSourceSchema.optional(),
  tag: z.string().trim().min(1).max(KB_TAG_MAX).optional(),
  pinned: z.stringbool().optional(),
  boostMachineId: z.string().min(1).optional(),
  excludeTicketId: z.string().min(1).optional(),
  sort: kbSortSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
});
export type KbSearchQuery = z.infer<typeof kbSearchQuerySchema>;

export const KB_DIAGNOSE_MAX = 2000;
export const kbDiagnoseSchema = z.strictObject({
  description: z.string().trim().min(3, "description is required").max(KB_DIAGNOSE_MAX),
  machineId: z.string().min(1).nullable().optional(),
  excludeTicketId: z.string().min(1).optional(),
});
export type KbDiagnoseInput = z.infer<typeof kbDiagnoseSchema>;

export const kbFeedbackSchema = z.strictObject({
  helpful: z.boolean().nullable(),
});
export type KbFeedbackInput = z.infer<typeof kbFeedbackSchema>;
