import { z } from "zod";

export const DEPARTMENT_COLORS = [
  "BLUE",
  "SKY",
  "TEAL",
  "GREEN",
  "LIME",
  "AMBER",
  "ORANGE",
  "PINK",
  "VIOLET",
  "GRAY",
] as const;
export const departmentColorSchema = z.enum(DEPARTMENT_COLORS);
export type DepartmentColor = z.infer<typeof departmentColorSchema>;

export const createDepartmentSchema = z.strictObject({
  name: z.string().trim().min(1, "name is required").max(120),
  description: z.string().trim().max(500).optional(),
  color: departmentColorSchema.optional(),
});
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    color: departmentColorSchema.optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "at least one field must be provided",
  });
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
