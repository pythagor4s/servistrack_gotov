"use client";

import { FadeText } from "@/components/ui/fade-text";
import Link from "next/link";
import { CheckCircle2, ChevronRight, CircleDashed, ImageOff, Wrench } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import type { Machine } from "@/lib/types";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { MachinePhoto } from "@/components/machine-photo";
import { ProfileCard, ProfileCardEditButton, ProfileCardFooter } from "@/components/profile-card";

function serviceState(m: Machine) {
  if (!m.active) return { label: "Neaktivno", icon: CircleDashed, className: "text-foreground-faint" };
  if ((m.openTicketCount ?? 0) > 0) return { label: "V servisu", icon: Wrench, className: "text-primary" };
  return { label: "Deluje", icon: CheckCircle2, className: "text-nav-foreground" };
}

export function MachineCard({
  machine: m,
  canManage,
  onEdit,
}: {
  machine: Machine;
  canManage: boolean;
  onEdit: () => void;
}) {
  const state = serviceState(m);
  const StateIcon = state.icon;
  const name = `${m.brand} ${m.model}`;
  const historyHref = `/sredstva?machine=${m.id}`;

  return (
    <ProfileCard tint="hover" className="mt-0 h-full">
      <div className="relative z-10 flex h-7 items-start px-1 pt-1">
        <Badge
          variant="outline"
          className="max-w-full bg-background/80 text-nav-foreground backdrop-blur-sm dark:bg-muted/80"
        >
          {m.department?.name ?? "Brez oddelka"}
        </Badge>
      </div>

      <Link
        href={historyHref}
        scroll={false}
        aria-label={`Zgodovina servisov | ${name}`}
        className="-mt-7 block overflow-hidden rounded-lg"
      >
        {m.hasImage ? (
          <MachinePhoto
            machine={{ id: m.id, image: { updatedAt: m.imageUpdatedAt ?? "" } }}
            className="w-full -translate-y-4 mask-b-from-55% mask-b-to-85%"
          />
        ) : (
          <div className="flex aspect-3/2 w-full items-start justify-center pt-12">
            <span className="flex size-12 items-center justify-center rounded-full bg-surface-inset text-foreground-faint">
              <ImageOff className="size-6" />
            </span>
          </div>
        )}
      </Link>

      <div className="relative isolate -mt-10 flex flex-1 flex-col px-2 pb-1">
        <Link href={historyHref} scroll={false} className="block min-w-0" tabIndex={-1}>
          <FadeText className="text-lg font-semibold">{name}</FadeText>
        </Link>
        <FadeText className="text-sm text-nav-foreground">
          <span className="inline-flex gap-3">
            <span>{m.type?.name ?? "Brez vrste"}</span>
            {m.serialNo && <span className="tabular-nums">#{m.serialNo}</span>}
          </span>
        </FadeText>
        {m.notes && <p className="fade-last-line mt-2 text-sm text-nav-foreground">{m.notes}</p>}

        <ProfileCardFooter
          status={
            <span className={cn("inline-flex items-center gap-1.5", state.className)}>
              <StateIcon className="size-[1.125rem] shrink-0" />
              {state.label}
            </span>
          }
          action={
            canManage ? (
              <ProfileCardEditButton onEdit={onEdit} />
            ) : (
              <Link
                href={historyHref}
                scroll={false}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "group/open h-8 w-full justify-center bg-transparent transition-colors duration-300",
                  "hover:border-primary hover:bg-primary hover:text-primary-foreground hover:delay-150",
                )}
              >
                Zgodovina
                <ChevronRight className="size-4 transition-transform duration-200 ease-out group-hover/open:translate-x-1 group-hover/open:delay-150 motion-reduce:transition-none" />
              </Link>
            )
          }
        />
      </div>
    </ProfileCard>
  );
}

export function MachineCardSkeleton() {
  return (
    <div className="card-edge animate-skeleton-appear flex h-full flex-col gap-0 rounded-xl p-2 shadow-md shadow-halo-soft [--card-fill:var(--card-surface)]">
      <div className="flex h-7 items-start px-1 pt-1">
        <Skeleton className="h-5 w-1/3 rounded-full" />
      </div>
      <div className="-mt-7 aspect-3/2 w-full" />
      <div className="-mt-10 flex flex-1 flex-col px-2 pb-1">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="mt-1 h-4 w-1/2" />
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
