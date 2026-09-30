"use client";

import { ticketTypeSchema } from "@servis-track/shared";
import type { TicketStatus, TicketPriority, TicketType } from "@servis-track/shared";
import { cn } from "@/lib/utils";
import type { ComboboxOption } from "@/components/ui/combobox";
import { ANIMATED_STATUS_ICON, StaticTruckIcon } from "@/components/status-icons";
import { CheckCircle2, Circle, Timer } from "lucide-react";
import {
  AlertTriangle,
  Building2,
  Check,
  X,
  Circle as PriorityCircle,
  CircleDashed,
  Cog,
  MonitorSmartphone,
  type IconComponent,
} from "@/components/icons";

export const STATUS_META: Record<
  TicketStatus,
  { label: string; icon: IconComponent; className: string }
> = {
  OPEN: { label: "Odprt", icon: Circle, className: "text-status-open" },
  IN_PROGRESS: { label: "V teku", icon: Timer, className: "text-status-progress" },
  SERVICER_COMING: { label: "Serviser prihaja", icon: StaticTruckIcon, className: "text-status-servicer" },
  RESOLVED: { label: "Rešen", icon: CheckCircle2, className: "text-muted-foreground" },
};

export const PRIORITY_META: Record<TicketPriority, { label: string; icon: IconComponent }> = {
  NORMAL: { label: "Običajna", icon: PriorityCircle },
  HIGH: { label: "Visoka prednost", icon: AlertTriangle },
};

export const PRIORITY_INLINE_OPTIONS: ComboboxOption[] = [
  { value: "NORMAL", label: PRIORITY_META.NORMAL.label, icon: PRIORITY_META.NORMAL.icon },
  { value: "HIGH", label: "Visoka", icon: PRIORITY_META.HIGH.icon, className: "text-priority-high" },
];

export const TYPE_META: Record<TicketType, { label: string; icon: IconComponent }> = {
  MACHINE: { label: "Stroj", icon: Cog },
  SOFTWARE: { label: "Programska oprema", icon: MonitorSmartphone },
  FACILITY: { label: "Objekt", icon: Building2 },
  OTHER: { label: "Drugo", icon: CircleDashed },
};

export const TYPE_OPTIONS: ComboboxOption[] = ticketTypeSchema.options.map((t) => ({
  value: t,
  label: TYPE_META[t].label,
  icon: TYPE_META[t].icon,
}));

export function StatusBadge({
  status,
  className,
  animate,
}: {
  status: TicketStatus;
  className?: string;
  animate?: boolean;
}) {
  const { label } = STATUS_META[status];
  const Icon = ANIMATED_STATUS_ICON[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 align-middle whitespace-nowrap text-sm text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-4 shrink-0" animate={animate} />
      {label}
    </span>
  );
}

export function ActivityBadge({
  active,
  labels = ["Aktiven", "Neaktiven"],
  className,
}: {
  active: boolean;
  labels?: readonly [string, string];
  className?: string;
}) {
  const Icon = active ? Check : X;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 align-middle text-sm font-medium whitespace-nowrap",
        active ? "bg-ticket-active/12 text-ticket-active" : "bg-foreground/6 text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" strokeWidth={2.25} />
      {active ? labels[0] : labels[1]}
    </span>
  );
}

export function FromTicketBadge({ number, className }: { number?: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full bg-ticket-active/12 px-2 py-0.5 text-xs leading-none font-medium whitespace-nowrap text-ticket-active",
        className,
      )}
    >
      Iz ticketa{number ? ` #${number}` : ""}
    </span>
  );
}
