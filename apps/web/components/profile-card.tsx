"use client";

import type { ReactNode } from "react";

import { Pencil } from "@/components/icons";
import {
  HoverTint,
  TINT_CURSOR,
  TINT_CURSOR_CARD,
  onTintCursorMove,
} from "@/components/hover-tint";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ProfileCard({
  children,
  onHoverChange,
  className,
  tint = "always",
}: {
  children: ReactNode;
  onHoverChange?: (hovered: boolean) => void;
  className?: string;
  tint?: "always" | "hover";
}) {
  return (
    <Card
      data-tint-host={tint === "hover" ? "hover" : "neutral"}
      onPointerMove={onTintCursorMove}
      onPointerEnter={(e) => e.pointerType === "mouse" && onHoverChange?.(true)}
      onPointerLeave={() => onHoverChange?.(false)}
      className={cn(
        "card-edge group/card relative isolate mt-8 flex h-[calc(100%-2rem)] flex-col gap-0 rounded-xl p-2 shadow-md shadow-halo-soft [--card-fill:var(--card-surface)]",
        TINT_CURSOR,
        TINT_CURSOR_CARD,
        "[--hover-tint-shape:circle_33.6rem] [--hover-tint-opacity:0.26] dark:[--hover-tint-opacity:0.16]",
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
        <HoverTint className="inset-0" />
      </div>
      {children}
    </Card>
  );
}

export function ProfileCardIdentity({
  avatar,
  name,
  sub,
}: {
  avatar: ReactNode;
  name: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="flex items-end gap-2">
      <div className="relative -mt-10 shrink-0 rounded-full">
        {avatar}
        <span aria-hidden className="card-avatar-arc pointer-events-none absolute -inset-px rounded-full border [mask-image:linear-gradient(to_bottom,black_50%,transparent_50%)]" />
      </div>
      <div className="min-w-0 flex-1 pb-0.5">
        <p className="truncate text-base leading-snug font-semibold">{name}</p>
        {sub && <p className="truncate text-xs font-medium text-nav-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export function ProfileCardFooter({ status, action }: { status: ReactNode; action?: ReactNode }) {
  return (
    <>
      <div className="mt-auto pt-3">
        <Separator />
      </div>
      <div className="grid grid-cols-2 gap-2 pt-3">
        <span className="inline-flex h-8 min-w-0 items-center justify-center gap-1.5 text-sm font-medium whitespace-nowrap text-nav-foreground">
          {status}
        </span>
        {action ?? <span />}
      </div>
    </>
  );
}

export function ProfileCardEditButton({ onEdit }: { onEdit: () => void }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "h-8 w-full justify-center bg-transparent transition-colors duration-300",
        "hover:bg-primary/5 hover:delay-150",
      )}
    >
      <Pencil className="size-3.5" /> Uredi
    </button>
  );
}

export function ProfileCardSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="card-edge animate-skeleton-appear mt-8 flex h-[calc(100%-2rem)] flex-col gap-0 rounded-xl p-2 shadow-md shadow-halo-soft [--card-fill:var(--card-surface)]">
      <div className="flex flex-1 flex-col px-2 pb-1">
        <div className="flex items-end gap-2">
          <Skeleton className="-mt-10 size-16 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1 pb-0.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <div className="space-y-2 pt-4">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-3/4" />
          ))}
        </div>
        <div className="mt-auto pt-3">
          <Separator />
        </div>
        <div className="grid grid-cols-2 gap-2 pt-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </div>
  );
}
