import { z } from "zod";
import { userEmailSchema } from "./users";

export const notificationChannelSchema = z.enum([
  "EMAIL",
  "SMS",
  "WEBHOOK",
]);
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;

export const ingestNotificationSchema = z.strictObject({
  ticketId: z.string().min(1),
  channel: notificationChannelSchema.optional(),
  recipient: z.string().trim().min(1).max(500),
});
export type IngestNotificationInput = z.infer<typeof ingestNotificationSchema>;

export const testEmailSchema = z.strictObject({
  to: userEmailSchema.optional(),
});
export type TestEmailInput = z.infer<typeof testEmailSchema>;
