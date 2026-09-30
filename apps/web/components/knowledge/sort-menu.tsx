"use client";

import { useState } from "react";
import { KB_SORTS, type KbSort } from "@servis-track/shared";

import { Check } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { plateTintProps } from "@/components/hover-tint";
import { Popover, PopoverContent, POPOVER_LABEL, POPOVER_LIST, PopoverTrigger } from "@/components/ui/popover";
import { IconAction } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { SORT_META } from "./kb-state";

export function SortMenu({
  value,
  querying,
  isDefault,
  onChange,
}: {
  value: KbSort;
  querying: boolean;
  isDefault: boolean;
  onChange: (sort: KbSort) => void;
}) {
  const [open, setOpen] = useState(false);
  const Icon = SORT_META[value].icon;
  const label = `Razvrsti: ${SORT_META[value].label}`;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <IconAction label={label}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-expanded={open}
            className="size-7 shrink-0"
          >
            <Icon className={cn("size-4 transition-colors", isDefault ? "text-muted-foreground" : "text-primary")} />
          </Button>
        </PopoverTrigger>
      </IconAction>
      <PopoverContent align="end" className="w-60 p-1">
        <div className={POPOVER_LABEL}>Razvrsti</div>
        <div className={POPOVER_LIST}>
          {KB_SORTS.filter((s) => s !== "relevance" || querying).map((s) => {
            const RowIcon = SORT_META[s].icon;
            return (
              <button
                key={s}
                type="button"
                aria-current={s === value || undefined}
                onClick={() => {
                  setOpen(false);
                  onChange(s);
                }}
                {...plateTintProps()}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none"
              >
                <RowIcon className="size-4 shrink-0 text-nav-foreground" />
                <span className="flex-1">{SORT_META[s].label}</span>
                {s === value && <Check className="size-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
