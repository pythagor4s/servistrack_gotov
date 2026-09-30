"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, POPOVER_LABEL, PopoverTrigger } from "@/components/ui/popover";

export type ColorOption<T extends string> = { value: T; label: string; dot: string };

export function ColorPicker<T extends string>({
  value,
  options,
  heading,
  swatch = "rounded-full",
  columns = 3,
  disabled,
  onChange,
}: {
  value: T | undefined;
  options: readonly ColorOption<T>[];
  heading: string;
  swatch?: string;
  columns?: 2 | 3;
  disabled: boolean;
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) ?? options[options.length - 1]!;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          disabled={disabled}
          aria-label={`Barva: ${current.label}`}
          aria-expanded={open}
        >
          <span className={cn("size-3", swatch, current.dot)} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-1">
        <div className={POPOVER_LABEL}>{heading}</div>
        <div className={cn("grid gap-1 p-1", columns === 2 ? "grid-cols-2" : "grid-cols-3")}>
          {options.map((o) => (
            <Button
              key={o.value}
              size="sm"
              variant="ghost"
              aria-pressed={o.value === value}
              className="justify-start gap-2 px-2 font-normal"
              onClick={() => {
                setOpen(false);
                if (o.value !== value) onChange(o.value);
              }}
            >
              <span className={cn("size-3 shrink-0", swatch, o.dot)} />
              {o.label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
