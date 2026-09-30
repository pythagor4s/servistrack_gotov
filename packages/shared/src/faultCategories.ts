import { z } from "zod";

export const FAULT_CATEGORY_ICONS = [
  "droplet",
  "palette",
  "scissors",
  "fan",
  "gears",
  "flash",
  "thermometer",
  "scroll",
  "software",
  "router",
  "building",
  "tools",
  "shield",
  "package",
  "monitor",
  "gauge",
  "radar",
  "magnet",
  "forklift",
  "uv",
  "bug",
  "alert",
] as const;
export const faultCategoryIconSchema = z.enum(FAULT_CATEGORY_ICONS);
export type FaultCategoryIcon = z.infer<typeof faultCategoryIconSchema>;

export const FAULT_CATEGORY_NAME_MAX = 60;

export const createFaultCategorySchema = z.strictObject({
  name: z.string().trim().min(1, "name is required").max(FAULT_CATEGORY_NAME_MAX),
  icon: faultCategoryIconSchema.default("tools"),
  description: z.string().trim().max(300).optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});
export type CreateFaultCategoryInput = z.infer<typeof createFaultCategorySchema>;

export const updateFaultCategorySchema = z
  .strictObject({
    name: z.string().trim().min(1).max(FAULT_CATEGORY_NAME_MAX).optional(),
    icon: faultCategoryIconSchema.optional(),
    description: z.string().trim().max(300).nullable().optional(),
    sortOrder: z.number().int().min(0).max(10_000).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "at least one field must be provided",
  });
export type UpdateFaultCategoryInput = z.infer<typeof updateFaultCategorySchema>;
