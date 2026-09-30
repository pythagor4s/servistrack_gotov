import { z } from "zod";

export const MACHINE_IMAGE = {
  width: 600,
  height: 400,
  maxBytes: 2 * 1024 * 1024,
  mimeTypes: ["image/png", "image/webp"],
} as const;

export const createMachineSchema = z.strictObject({
  brand: z.string().trim().min(1, "brand is required").max(120),
  model: z.string().trim().min(1, "model is required").max(120),
  serialNo: z.string().trim().max(120).optional(),
  departmentId: z.string().min(1).optional(),
  typeId: z.string().min(1).optional(),
  attachedToId: z.string().min(1).optional(),
  active: z.boolean().optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type CreateMachineInput = z.infer<typeof createMachineSchema>;

export const updateMachineSchema = z
  .strictObject({
    brand: z.string().trim().min(1).max(120).optional(),
    model: z.string().trim().min(1).max(120).optional(),
    serialNo: z.string().trim().max(120).nullable().optional(),
    departmentId: z.string().min(1).nullable().optional(),
    typeId: z.string().min(1).nullable().optional(),
    attachedToId: z.string().min(1).nullable().optional(),
    active: z.boolean().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "at least one field must be provided",
  });
export type UpdateMachineInput = z.infer<typeof updateMachineSchema>;
