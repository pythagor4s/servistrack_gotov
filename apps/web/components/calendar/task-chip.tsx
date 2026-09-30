"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { CheckCircle2 } from "@/components/icons";

import { cn } from "@/lib/utils";
import { formatMinutes, taskTimeLabel } from "@/lib/calendar";
import type { CalendarOccurrence, CalendarTask } from "@/lib/types";
import { onTintCursorLeave, onTintCursorMoveCentered } from "@/components/hover-tint";
import { colorMetaOf } from "@/components/calendar/calendar-meta";

export type CalendarItem = { task: CalendarTask; occurrence: CalendarOccurrence };

export const itemKey = (i: CalendarItem) => `${i.task.id}|${i.occurrence.date}`;

export type DragStart = (
  e: ReactPointerEvent<HTMLElement>,
  item: CalendarItem,
  mode?: "move" | "resize",
) => void;

const DRAGGING = "relative z-20 ring-2 ring-ring/60 shadow-md shadow-halo-medium";

export function TaskChip({
  item,
  showTime = true,
  onOpen,
  onDragStart,
  dragging,
  className,
}: {
  item: CalendarItem;
  showTime?: boolean;
  onOpen: (item: CalendarItem) => void;
  onDragStart?: DragStart;
  dragging?: boolean;
  className?: string;
}) {
  const { task, occurrence } = item;
  const meta = colorMetaOf(task.category?.color);
  const done = !!occurrence.completion;
  return (
    <button
      type="button"
      data-tint="center"
      onPointerMove={onTintCursorMoveCentered}
      onPointerLeave={onTintCursorLeave}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(item);
      }}
      onPointerDown={onDragStart ? (e) => onDragStart(e, item) : undefined}
      title={`${task.title} · ${taskTimeLabel(task)}`}
      className={cn(
        "flex h-6 w-full min-w-0 shrink-0 items-center gap-1.5 rounded-sm px-1.5 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        meta.fill,
        dragging && DRAGGING,
        className,
      )}
    >
      {done && (
        <CheckCircle2 className="size-3 shrink-0 text-muted-foreground" role="img" aria-label="Opravljeno" />
      )}
      {showTime && task.startMinute !== null && (
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {formatMinutes(task.startMinute)}
        </span>
      )}
      <span className={cn("truncate", done && "text-muted-foreground line-through")}>
        {task.title}
      </span>
    </button>
  );
}

export function TaskBlock({
  item,
  style,
  onOpen,
  onDragStart,
  dragging,
  roomy,
}: {
  item: CalendarItem;
  style: CSSProperties;
  onOpen: (item: CalendarItem) => void;
  onDragStart?: DragStart;
  dragging?: boolean;
  roomy: boolean;
}) {
  const { task, occurrence } = item;
  const meta = colorMetaOf(task.category?.color);
  const done = !!occurrence.completion;
  return (
    <button
      type="button"
      data-tint="center"
      onPointerMove={onTintCursorMoveCentered}
      onPointerLeave={onTintCursorLeave}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(item);
      }}
      onPointerDown={onDragStart ? (e) => onDragStart(e, item, "move") : undefined}
      style={style}
      className={cn(
        "pointer-events-auto absolute flex flex-col items-start overflow-hidden rounded-md bg-background px-1.5 py-1 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        dragging && "z-20 ring-2 ring-ring/60 shadow-md shadow-halo-medium",
      )}
    >
      <span aria-hidden="true" className={cn("absolute inset-0", meta.fill)} />
      <span className="relative flex w-full min-w-0 items-center gap-1">
        {done && (
          <CheckCircle2 className="size-3 shrink-0 text-muted-foreground" role="img" aria-label="Opravljeno" />
        )}
        <span className={cn("truncate font-medium", done && "text-muted-foreground line-through")}>
          {task.title}
        </span>
      </span>
      <span className="relative truncate tabular-nums text-muted-foreground">
        {taskTimeLabel(task)}
      </span>
      {roomy && task.machine && (
        <span className="relative w-full truncate text-muted-foreground">
          {task.machine.brand} {task.machine.model}
        </span>
      )}
      {onDragStart && (
        <span
          aria-hidden="true"
          onPointerDown={(e) => onDragStart(e, item, "resize")}
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
        />
      )}
    </button>
  );
}
