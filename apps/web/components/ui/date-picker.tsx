"use client";

import * as React from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "@/components/icons";
import { dayNumber } from "@servis-track/shared";

import { cn } from "@/lib/utils";
import {
  formatDayWithWeekday,
  formatMonthYear,
  isOffDay,
  formatWeekdayShort,
  isSameMonth,
  monthGridDays,
  shiftAnchor,
  todayLocal,
} from "@/lib/calendar";
import { onTintCursorLeave, onTintCursorMovePlate } from "@/components/hover-tint";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { INLINE_TRIGGER } from "@/components/ui/combobox";

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Izberite dan",
  clearable = false,
  clearLabel = "Počisti",
  min,
  workdaysOnly = false,
  invalid,
  variant = "field",
  className,
}: {
  id?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  clearable?: boolean;
  clearLabel?: string;
  min?: string | null;
  workdaysOnly?: boolean;
  invalid?: boolean;
  variant?: "field" | "inline";
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState(() => value ?? todayLocal());
  const today = todayLocal();

  React.useEffect(() => {
    if (open) setMonth(value ?? min ?? todayLocal());
  }, [open, value, min]);

  const days = monthGridDays(month);
  const pick = (next: string | null) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant={variant === "inline" ? "ghost" : "outline"}
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          data-tint=""
          onPointerMove={onTintCursorMovePlate}
          onPointerLeave={onTintCursorLeave}
          className={cn(
            variant === "inline" ? INLINE_TRIGGER : "w-full justify-between font-normal",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <CalendarDays className="size-4 shrink-0" />
            <span className="truncate">
              {value ? (
                formatDayWithWeekday(value)
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </span>
          </span>
          {variant !== "inline" && (
            <ChevronDown
              className={cn(
                "size-4 shrink-0 opacity-50 transition-transform duration-200 ease-out motion-reduce:transition-none",
                open && "rotate-180",
              )}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <div className="mb-1 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Prejšnji mesec"
            onClick={() => setMonth((m) => shiftAnchor("month", m, -1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium first-letter:uppercase">{formatMonthYear(month)}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Naslednji mesec"
            onClick={() => setMonth((m) => shiftAnchor("month", m, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {days.slice(0, 7).map((d) => (
            <span
              key={d}
              className="flex h-7 items-center justify-center text-[0.6875rem] font-medium text-group-heading uppercase select-none"
            >
              {formatWeekdayShort(d).replace(".", "")}
            </span>
          ))}
          {days.map((d) => {
            const selected = d === value;
            const outside = !isSameMonth(d, month);
            const disabled =
              (!!min && dayNumber(d) < dayNumber(min)) || (workdaysOnly && isOffDay(d));
            return (
              <Button
                key={d}
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={disabled}
                aria-pressed={selected}
                aria-label={formatDayWithWeekday(d)}
                aria-current={d === today ? "date" : undefined}
                className={cn(
                  "tabular-nums",
                  outside && !selected && "text-foreground-faint",
                  selected && "font-semibold text-foreground",
                  d === today && "ring-1 ring-border-row-hover ring-inset",
                )}
                onClick={() => pick(d)}
              >
                {Number(d.slice(8, 10))}
              </Button>
            );
          })}
        </div>

        <div className="mt-1 border-t pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            disabled={!clearable && workdaysOnly && isOffDay(today)}
            onClick={() => pick(clearable ? null : today)}
          >
            {clearable ? clearLabel : "Danes"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
