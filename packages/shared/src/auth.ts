import { z } from "zod";
import { departmentColorSchema } from "./departments";

export const roleSchema = z.enum(["ADMIN", "TECHNICIAN"]);
export type Role = z.infer<typeof roleSchema>;

export const loginSchema = z.strictObject({
  username: z.string().trim().min(1, "username is required"),
  password: z.string().min(1, "password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const publicUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string().nullable(),
  role: roleSchema,
  phone: z.string().nullable(),
  active: z.boolean(),
  email: z.string().nullable(),
  departmentId: z.string().nullable(),
  department: z.object({ id: z.string(), name: z.string(), color: departmentColorSchema }).nullable(),
  hasImage: z.boolean(),
  imageUpdatedAt: z.string().nullable(),
});
export type PublicUser = z.infer<typeof publicUserSchema>;
