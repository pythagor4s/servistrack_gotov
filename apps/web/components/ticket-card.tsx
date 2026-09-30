"use client";

import { useState } from "react";

import { TYPE_META, StatusBadge } from "@/components/badges";
import { DepartmentBadge } from "@/components/department-badge";
import { User } from "@/components/icons";
import { AnimatedCircleCheckIcon } from "@/components/status-icons";
import { UserAvatar } from "@/components/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ticketLabel, type Ticket } from "@/lib/types";
import { cn } from "@/lib/utils";

const isFinished = (t: Ticket) => t.status === "RESOLVED";

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}. ${d.getMonth() + 1}.`;
}

export function TicketCard({
  ticket: t,
  onOpen,
}: {
  ticket: Ticket;
  onOpen: (id: string, e: React.MouseEvent | React.KeyboardEvent) => void;
}) {
  const finished = isFinished(t);
  const reporter = t.reporter?.name ?? t.reporter?.username ?? t.reporterName;
  const urgent = !finished && t.priority === "HIGH";
  const asset = t.machine ? `${t.machine.brand} ${t.machine.model}` : TYPE_META[t.type].label;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={ticketLabel(t, TYPE_META[t.type].label)}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onClick={(e) => onOpen(t.id, e)}
      onAuxClick={(e) => e.button === 1 && onOpen(t.id, e)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(t.id, e);
        }
      }}
      className="flex h-full cursor-pointer flex-col rounded-xl border bg-card-surface p-4 outline-none transition-colors hover:border-border-row-hover focus-visible:border-foreground/50"
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        {finished && t.resolvedAt ? (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
            <AnimatedCircleCheckIcon className="size-4 shrink-0" animate={hovered} />
            Rešen {shortDate(t.resolvedAt)}
          </span>
        ) : (
          <StatusBadge status={t.status} animate={hovered} className={cn(urgent && "font-medium text-priority-high")} />
        )}
        <span className="shrink-0 text-xs text-nav-foreground tabular-nums">{shortDate(t.createdAt)}</span>
      </div>

      <p className={cn("mt-3 line-clamp-2 leading-snug font-semibold", finished && "text-nav-foreground")}>
        {t.title}
      </p>
      <p className="mt-1 truncate text-sm text-nav-foreground">{asset}</p>

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        {t.department ? (
          <DepartmentBadge department={t.department} className="min-w-0 text-muted-foreground" />
        ) : (
          <span />
        )}
        <span title={reporter ?? undefined} className="shrink-0">
          {t.reporter ? (
            <UserAvatar
              user={{
                id: t.reporter.id,
                name: t.reporter.name,
                username: t.reporter.username,
                hasImage: t.reporter.image != null,
                imageUpdatedAt: t.reporter.image?.updatedAt ?? null,
              }}
              className="size-7 dark:brightness-[0.88] dark:saturate-[0.85]"
            />
          ) : (
            <span className="flex size-7 items-center justify-center rounded-full bg-muted text-foreground-faint">
              <User className="size-3.5" />
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

export function TicketCardSkeleton() {
  return (
    <div className="animate-skeleton-appear flex h-full flex-col rounded-xl border bg-card-surface p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-10" />
      </div>
      <Skeleton className="mt-3 h-5 w-full" />
      <Skeleton className="mt-1 h-5 w-2/3" />
      <Skeleton className="mt-1.5 h-4 w-1/2" />
      <div className="mt-auto flex items-center justify-between pt-4">
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="size-7 rounded-full" />
      </div>
    </div>
  );
}
