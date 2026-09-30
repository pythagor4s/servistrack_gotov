import { z } from "zod";
import { publicUserSchema, roleSchema } from "./auth";

export const USER_IMAGE = {
  minSize: 128,
  maxSize: 2000,
  maxBytes: 2 * 1024 * 1024,
  mimeTypes: ["image/png", "image/webp", "image/jpeg"],
  aspectTolerance: 0.05,
} as const;

export const userEmailSchema = z.string().trim().toLowerCase().email().max(200);

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "username must be at least 3 characters")
  .max(40)
  .regex(/^[a-z0-9._-]+$/, "username may use only a-z, 0-9, . _ -");

export const phoneSchema = z
  .string()
  .trim()
  .max(40)
  .regex(/^[0-9+()\-.\s]+$/, "phone may use only digits, spaces and + ( ) - .");

export const createUserSchema = z.strictObject({
  username: usernameSchema,
  name: z.string().trim().min(1, "name is required").max(120),
  password: z.string().min(8, "password must be at least 8 characters").max(200),
  role: roleSchema.optional(),
  phone: phoneSchema.optional(),
  email: userEmailSchema.optional(),
  departmentId: z.string().min(1).optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(120).optional(),
    role: roleSchema.optional(),
    phone: phoneSchema.nullable().optional(),
    active: z.boolean().optional(),
    password: z.string().min(8, "password must be at least 8 characters").max(200).optional(),
    email: userEmailSchema.nullable().optional(),
    departmentId: z.string().min(1).nullable().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "at least one field must be provided",
  });
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const themePrefSchema = z.enum(["DARK", "LIGHT"]);
export type ThemePref = z.infer<typeof themePrefSchema>;

export const listViewSchema = z.enum(["CARDS", "TABLE"]);
export type ListView = z.infer<typeof listViewSchema>;

export const userPreferencesSchema = z.object({
  theme: themePrefSchema,
  viewTickets: listViewSchema,
  viewMachines: listViewSchema,
  viewServicers: listViewSchema,
  viewUsers: listViewSchema,
  notifyEmail: z.boolean(),
});
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

export const updatePreferencesSchema = userPreferencesSchema
  .partial()
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "at least one field must be provided",
  });
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

export const sessionUserSchema = publicUserSchema.extend({
  preferences: userPreferencesSchema,
});
export type SessionUser = z.infer<typeof sessionUserSchema>;
