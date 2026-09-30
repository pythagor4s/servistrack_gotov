import * as React from "react"

import { cn } from "@/lib/utils"
import {
  onTintCursorLeave,
  onTintCursorMovePlate,
  TINT_SHAPE_FIELD,
} from "@/components/hover-tint"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border bg-field px-3 py-2 text-base shadow-sm shadow-halo-soft transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-foreground/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:ring-destructive/40",
        "hover:border-border-row-hover",
        TINT_SHAPE_FIELD,
        className
      )}
      {...props}
      data-tint=""
      onPointerMove={onTintCursorMovePlate}
      onPointerLeave={onTintCursorLeave}
    />
  )
}

export { Textarea }
