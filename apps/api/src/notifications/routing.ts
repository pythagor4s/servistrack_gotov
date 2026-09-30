import type { NotificationChannel, TicketPriority } from "@servis-track/shared";

export function chooseChannel(priority: TicketPriority, smsAvailable = true): NotificationChannel {
  return priority === "HIGH" && smsAvailable ? "SMS" : "EMAIL";
}
