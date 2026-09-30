import { z } from "zod";

export const errorCodeSchema = z.enum([
  "validation_error",
  "bad_reference",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "too_many_requests",
  "internal_error",
]);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const errorDetailSchema = z.object({
  path: z.string(),
  message: z.string(),
});

export type ErrorDetail = z.infer<typeof errorDetailSchema>;

export const errorBodySchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.array(errorDetailSchema).optional(),
  }),
});

export type ErrorBody = z.infer<typeof errorBodySchema>;
