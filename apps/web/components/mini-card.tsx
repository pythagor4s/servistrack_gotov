"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ProfileCard } from "@/components/profile-card";
import { FadeText } from "@/components/ui/fade-text";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { IconComponent } from "@/components/icons";

export function MiniCardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function MiniCardSkeletons({ count = 4 }: { count?: number }) {
  return Array.from({ length: count }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />);
}

export function MiniCard({
  title,
  meta,
  metaIcon: MetaIcon,
  metaIconClassName,
  side,
  href,
  onClick,
}: {
  title: string;
  meta: ReactNode;
  metaIcon?: IconComponent;
  metaIconClassName?: string;
  side: ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      <FadeText className="text-sm font-medium">{title}</FadeText>
      <span className="mt-auto flex items-center justify-between gap-3 text-xs text-nav-foreground">
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          {MetaIcon && <MetaIcon className={cn("size-3.5 shrink-0", metaIconClassName)} />}
          <FadeText className="min-w-0 flex-1">{meta}</FadeText>
        </span>
        <span className="shrink-0">{side}</span>
      </span>
    </>
  );
  const cls = "flex h-full w-full flex-col gap-4 rounded-[inherit] p-3 text-left outline-none";
  return (
    <ProfileCard tint="hover" className="card-edge-clear mt-0 h-full p-0 shadow-none">
      {href ? (
        <Link href={href} className={cls}>
          {body}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={cls}>
          {body}
        </button>
      )}
    </ProfileCard>
  );
}
