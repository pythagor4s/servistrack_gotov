"use client";

import { useState } from "react";
import { FAULT_CATEGORY_ICONS, type FaultCategoryIcon } from "@servis-track/shared";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, POPOVER_LABEL, PopoverTrigger } from "@/components/ui/popover";
import { FAULT_ICON, NO_CATEGORY_ICON } from "@/lib/fault-categories";

export function CategoryIconPicker({
  value,
  disabled,
  onChange,
}: {
  value: string | undefined;
  disabled: boolean;
  onChange: (icon: FaultCategoryIcon) => void;
}) {
  const [open, setOpen] = useState(false);
  const Current = FAULT_ICON[value as FaultCategoryIcon] ?? NO_CATEGORY_ICON;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="icon-sm" variant="ghost" disabled={disabled} aria-label="Ikona kategorije" aria-expanded={open}>
          <Current className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-1">
        <div className={POPOVER_LABEL}>Ikona kategorije</div>
        <div className="grid grid-cols-6 gap-1 p-1">
          {FAULT_CATEGORY_ICONS.map((key) => {
            const Icon = FAULT_ICON[key];
            return (
              <Button
                key={key}
                size="icon-sm"
                variant="ghost"
                aria-label={key}
                aria-pressed={key === value}
                onClick={() => {
                  setOpen(false);
                  if (key !== value) onChange(key);
                }}
              >
                <Icon className="size-4" />
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
