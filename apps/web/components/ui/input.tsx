import * as React from "react"

import { cn } from "@/lib/utils"
import {
  onTintCursorLeave,
  onTintCursorMovePlate,
  TINT_SHAPE_FIELD,
} from "@/components/hover-tint"

function Input({
  className,
  type,
  tint = true,
  ...props
}: React.ComponentProps<"input"> & { tint?: boolean }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border bg-field px-3 py-1 text-base shadow-sm shadow-halo-soft transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-foreground/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        "hover:border-border-row-hover",
        tint && TINT_SHAPE_FIELD,
        className
      )}
      {...props}
      {...(tint
        ? {
            "data-tint": "",
            onPointerMove: onTintCursorMovePlate,
            onPointerLeave: onTintCursorLeave,
          }
        : null)}
    />
  )
}

export { Input }
