import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PropertyList({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <dl className={cn("grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-x-4 gap-y-1", className)}>
      {children}
    </dl>
  );
}

export function PropertyRow({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <>
      <dt className="flex h-8 items-center text-sm text-muted-foreground">{label}</dt>
      <dd className="flex min-h-8 min-w-0 flex-col justify-center">
        {children}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </dd>
    </>
  );
}

export function PropertyInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={cn(
        "-ml-2 h-8 w-[calc(100%+0.5rem)] min-w-0 rounded-md bg-transparent px-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 hover:bg-surface-hover focus-visible:bg-surface-hover aria-invalid:ring-1 aria-invalid:ring-destructive",
        className,
      )}
    />
  );
}
