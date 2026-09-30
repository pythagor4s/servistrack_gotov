import { z } from "zod";

export const createServicerSchema = z.strictObject({
  name: z.string().trim().min(1, "name is required").max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().max(40).optional(),
  specialty: z.string().trim().max(120).optional(),
  address: z.string().trim().max(200).optional(),
  active: z.boolean().optional(),
});
export type CreateServicerInput = z.infer<typeof createServicerSchema>;

export const updateServicerSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(120).optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    specialty: z.string().trim().max(120).nullable().optional(),
    address: z.string().trim().max(200).nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "at least one field must be provided",
  });
export type UpdateServicerInput = z.infer<typeof updateServicerSchema>;
