import { z } from "zod";

export const createMachineTypeSchema = z.strictObject({
  name: z.string().trim().min(1, "name is required").max(120),
  description: z.string().trim().max(500).optional(),
});
export type CreateMachineTypeInput = z.infer<typeof createMachineTypeSchema>;

export const updateMachineTypeSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "at least one field must be provided",
  });
export type UpdateMachineTypeInput = z.infer<typeof updateMachineTypeSchema>;
