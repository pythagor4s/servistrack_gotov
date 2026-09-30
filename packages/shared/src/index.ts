import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export * from "./errors";
export * from "./tickets";
export * from "./knowledge";
export * from "./faultCategories";
export * from "./markdown";

export * from "./auth";
export * from "./notifications";

export * from "./users";

export * from "./servicers";
export * from "./workflow";

export * from "./machines";
export * from "./departments";
export * from "./machineTypes";

export * from "./externalCodes";

export * from "./calendar";
