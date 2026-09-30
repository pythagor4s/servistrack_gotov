"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import {
  formatDayWithWeekday,
  formatWeekdayShort,
  isSameMonth,
} from "@/lib/calendar";
import {
  onTintCursorLeave,
  onTintCursorMovePlate,
  TINT_SHAPE_AREA,
} from "@/components/hover-tint";
import { SURFACE_FRAME } from "@/components/ui/card";
import { Popover, PopoverContent, POPOVER_LABEL, PopoverTrigger } from "@/components/ui/popover";
import { TABLE_HEAD_TEXT } from "@/components/ui/table";
import {
  itemKey,
  TaskChip,
  type CalendarItem,
  type DragStart,
} from "@/components/calendar/task-chip";

const VISIBLE_CHIPS = 3;
const CHIP_HEIGHT = 24;
const CHIP_GAP = 4;

export function MonthView({
  days,
  anchor,
  today,
  itemsByDay,
  onCreate,
  onOpen,
  onDragStart,
  activeKey,
  className,
}: {
  days: string[];
  anchor: string;
  today: string;
  itemsByDay: Map<string, CalendarItem[]>;
  onCreate: (date: string) => void;
  onOpen: (item: CalendarItem) => void;
  onDragStart?: DragStart;
  activeKey?: string | null;
  className?: string;
}) {
  return (
    <div className={cn(SURFACE_FRAME, "flex flex-col overflow-hidden", className)}>
      <div className="grid grid-cols-5 border-b bg-surface-raised [&>*:last-child]:border-r-0">
        {days.slice(0, 5).map((d) => (
          <div
            key={d}
            className={cn(TABLE_HEAD_TEXT, "flex h-11 items-center justify-center border-r uppercase tracking-wide")}
          >
            {formatWeekdayShort(d).replace(".", "")}
          </div>
        ))}
      </div>
      <div className="grid flex-1 auto-rows-fr grid-cols-5 [&>*:nth-child(5n)]:border-r-0 [&>*:nth-last-child(-n+5)]:border-b-0">
        {days.map((d) => (
          <DayCell
            key={d}
            date={d}
            outside={!isSameMonth(d, anchor)}
            isToday={d === today}
            items={itemsByDay.get(d) ?? []}
            onCreate={onCreate}
            onOpen={onOpen}
            onDragStart={onDragStart}
            activeKey={activeKey}
          />
        ))}
      </div>
    </div>
  );
}

function DayCell({
  date,
  outside,
  isToday,
  items,
  onCreate,
  onOpen,
  onDragStart,
  activeKey,
}: {
  date: string;
  outside: boolean;
  isToday: boolean;
  items: CalendarItem[];
  onCreate: (date: string) => void;
  onOpen: (item: CalendarItem) => void;
  onDragStart?: DragStart;
  activeKey?: string | null;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [capacity, setCapacity] = useState(VISIBLE_CHIPS);
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const measure = () =>
      setCapacity(Math.max(0, Math.floor((el.clientHeight + CHIP_GAP) / (CHIP_HEIGHT + CHIP_GAP))));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fits = items.length <= capacity;
  const shown = fits ? items : items.slice(0, Math.max(0, capacity - 1));
  const hidden = items.length - shown.length;
  return (
    <div
      data-tint=""
      onPointerMove={onTintCursorMovePlate}
      onPointerLeave={onTintCursorLeave}
      onClick={() => onCreate(date)}
      aria-label={formatDayWithWeekday(date)}
      data-cal-day={date}
      data-cal-kind="month"
      className={cn(
        TINT_SHAPE_AREA,
        "flex min-h-0 min-w-0 flex-col gap-1 overflow-hidden border-r border-b p-1.5",
        isToday && "bg-calendar-today-col",
      )}
    >
      <span
        className={cn(
          "flex size-6 items-center justify-center self-start rounded-full text-xs tabular-nums select-none",
          isToday
            ? "bg-primary font-semibold text-primary-foreground"
            : outside
              ? "text-foreground-faint"
              : "text-foreground",
        )}
      >
        {Number(date.slice(8, 10))}
      </span>
      <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
      {shown.map((item) => (
        <TaskChip
          key={itemKey(item)}
          item={item}
          onOpen={onOpen}
          onDragStart={onDragStart}
          dragging={activeKey === itemKey(item)}
        />
      ))}
      {hidden > 0 && capacity > 0 && (
        <Popover open={moreOpen} onOpenChange={setMoreOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              data-tint="center"
              onPointerMove={onTintCursorMovePlate}
              onPointerLeave={onTintCursorLeave}
              onClick={(e) => e.stopPropagation()}
              className="h-6 shrink-0 self-start rounded-sm px-1.5 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              +{hidden} več
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-64 p-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={POPOVER_LABEL}>{formatDayWithWeekday(date)}</div>
            <div className="flex flex-col gap-1 p-1">
              {items.map((item) => (
                <TaskChip
                  key={itemKey(item)}
                  item={item}
                  onOpen={(i) => {
                    setMoreOpen(false);
                    onOpen(i);
                  }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
      </div>
    </div>
  );
}
