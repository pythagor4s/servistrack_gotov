"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function KpiStrip({ cols = 4, className, children }: { cols?: 3 | 4; className?: string; children: ReactNode }) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-xl border",
        cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </dl>
  );
}

export function Kpi({
  label,
  value,
  unit,
  note,
  href,
  loading,
  className,
}: {
  label: string;
  value: string;
  unit?: string;
  note: ReactNode;
  href?: string;
  loading: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative -mt-px -ml-px min-w-0 border-t border-l px-5 py-4 transition-colors",
        href && "has-[a:hover]:bg-surface-hover",
        className,
      )}
    >
      <dt className="truncate text-sm text-nav-foreground">{label}</dt>
      <dd className="mt-2 flex h-9 items-baseline gap-1.5">
        {loading ? (
          <Skeleton className="h-8 w-14" />
        ) : (
          <>
            <span className="text-[2rem] leading-none font-semibold tracking-tight tabular-nums">{value}</span>
            {unit && <span className="text-sm font-medium text-nav-foreground">{unit}</span>}
          </>
        )}
      </dd>
      <dd className="mt-1 truncate text-xs text-nav-foreground">{loading ? " " : note}</dd>
      {href && <Link href={href} className="absolute inset-0" aria-label={`${label}: ${value}`} />}
    </div>
  );
}
