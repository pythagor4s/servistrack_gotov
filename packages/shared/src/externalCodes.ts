import { z } from "zod";
import { EXTERNAL_CODE_MAX } from "./tickets";

export const EXTERNAL_CODE_KINDS = ["MACHINE", "DEPARTMENT", "CATEGORY", "WORKER"] as const;
export const externalCodeKindSchema = z.enum(EXTERNAL_CODE_KINDS);
export type ExternalCodeKind = z.infer<typeof externalCodeKindSchema>;

export const mapExternalCodeSchema = z.strictObject({
  targetId: z.string().min(1).nullable(),
});
export type MapExternalCodeInput = z.infer<typeof mapExternalCodeSchema>;

export const createExternalCodeSchema = z.strictObject({
  kind: externalCodeKindSchema,
  code: z.string().trim().min(1, "code is required").max(EXTERNAL_CODE_MAX),
  label: z.string().trim().min(1).max(200).optional(),
  targetId: z.string().min(1).nullable().optional(),
});
export type CreateExternalCodeInput = z.infer<typeof createExternalCodeSchema>;
