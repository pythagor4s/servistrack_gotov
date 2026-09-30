"use client";

import { onTintCursorLeave, onTintCursorMoveCentered } from "@/components/hover-tint";
import { cn } from "@/lib/utils";

export const SEGMENT_TRACK =
  "h-9 shrink-0 items-center gap-0.5 rounded-md border bg-field p-px shadow-sm shadow-halo-soft " +
  "transition-colors hover:border-border-row-hover";

export const segmentPosition = (active: boolean) =>
  cn(
    "rounded-sm",
    active
      ? "text-foreground shadow-sm shadow-halo-soft"
      : "text-muted-foreground",
  );

export const segmentTintProps = () => ({
  "data-tint": "center",
  onPointerMove: onTintCursorMoveCentered,
  onPointerLeave: onTintCursorLeave,
});
