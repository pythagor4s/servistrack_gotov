import * as React from "react";

import { cn } from "@/lib/utils";

export function FlashInput({
  placeholder,
  className,
  value,
  ...props
}: Omit<React.ComponentProps<"input">, "value"> & { value: string; placeholder: string }) {
  return (
    <div className={cn("relative", className)}>
      <input
        {...props}
        value={value}
        placeholder={placeholder}
        className="w-full bg-transparent outline-none placeholder:text-transparent"
      />
      {!value && (
        <span
          aria-hidden="true"
          className="text-flash pointer-events-none absolute inset-y-0 left-0 flex items-center whitespace-nowrap select-none"
        >
          {placeholder}
        </span>
      )}
    </div>
  );
}
