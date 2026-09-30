"use client";

import type { IconComponent } from "@/components/icons";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { EmptyCell } from "@/components/ui/table";
import { IconAction } from "@/components/ui/tooltip";

export function CopyableValue({
  value,
  icon: Icon,
  copiedLabel,
  toastId,
  showIcon = true,
  hint = true,
  empty = <EmptyCell />,
  tone = "muted",
  className,
  clamp = false,
}: {
  value?: string | null;
  icon: IconComponent;
  copiedLabel: string;
  toastId: string;
  showIcon?: boolean;
  hint?: boolean;
  empty?: React.ReactNode;
  tone?: "muted" | "inherit";
  className?: string;
  clamp?: boolean;
}) {
  if (!value) {
    return <span className={cn("text-muted-foreground", className)}>{empty}</span>;
  }

  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value as string);
      toast.success(copiedLabel, { id: toastId });
    } catch {
      toast.error("Kopiranje ni uspelo", { id: toastId });
    }
  }

  const body = (
    <button
      type="button"
      onClick={copy}
      aria-label={`Kopiraj ${value}`}
      className={cn(
        "inline-flex max-w-full gap-1.5 text-left transition-colors hover:underline",
        tone === "muted" && "text-muted-foreground hover:text-foreground",
        clamp ? "items-start" : "items-center whitespace-nowrap",
        className,
      )}
    >
      {showIcon && <Icon className={cn("size-3.5 shrink-0", clamp && "mt-1")} />}
      <span className={clamp ? "line-clamp-2" : "truncate"}>{value}</span>
    </button>
  );

  if (!hint) return body;
  return <IconAction label="Kliknite za kopiranje">{body}</IconAction>;
}
