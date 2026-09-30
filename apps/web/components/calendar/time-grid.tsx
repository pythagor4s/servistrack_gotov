"use client";

import type { CSSProperties } from "react";
import { CALENDAR_DAY_END, CALENDAR_DAY_START } from "@servis-track/shared";

import { cn } from "@/lib/utils";
import {
  formatDayWithWeekday,
  formatMinutes,
  formatWeekdayShort,
  SLOT_HEIGHT,
  SLOT_MINUTES,
} from "@/lib/calendar";
import {
  onTintCursorLeave,
  onTintCursorMovePlate,
  TINT_SHAPE_AREA,
  TINT_SHAPE_FIELD,
} from "@/components/hover-tint";
import { SURFACE_FRAME } from "@/components/ui/card";
import { TABLE_HEAD_TEXT } from "@/components/ui/table";
import {
  itemKey,
  TaskBlock,
  TaskChip,
  type CalendarItem,
  type DragStart,
} from "@/components/calendar/task-chip";
import type { DrawPreview, DrawStart } from "@/components/calendar/use-calendar-drag";

const GRID_PAD = 8;
const MIN_SLOT_HEIGHT = 16;

function gridScale(start: number, end: number) {
  const span = end - start;
  return { start, end, span, slots: span / SLOT_MINUTES, frac: (minute: number) => (minute - start) / span };
}
type GridScale = ReturnType<typeof gridScale>;
const inPadded = (f: number) => `calc(${GRID_PAD}px + ${f} * (100% - ${2 * GRID_PAD}px))`;

type Placed = CalendarItem & { col: number; cols: number };

function layoutDay(items: CalendarItem[]): Placed[] {
  const timed = items
    .filter((i) => i.task.startMinute !== null && i.task.endMinute !== null)
    .sort(
      (a, b) =>
        a.task.startMinute! - b.task.startMinute! || b.task.endMinute! - a.task.endMinute!,
    );
  const out: Placed[] = [];
  let cluster: CalendarItem[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const columnEnds: number[] = [];
    const placed = cluster.map((item) => {
      let col = columnEnds.findIndex((end) => end <= item.task.startMinute!);
      if (col === -1) {
        col = columnEnds.length;
        columnEnds.push(item.task.endMinute!);
      } else {
        columnEnds[col] = item.task.endMinute!;
      }
      return { item, col };
    });
    for (const p of placed) out.push({ ...p.item, col: p.col, cols: columnEnds.length });
    cluster = [];
    clusterEnd = -1;
  };
  for (const item of timed) {
    if (cluster.length > 0 && item.task.startMinute! >= clusterEnd) flush();
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.task.endMinute!);
  }
  if (cluster.length > 0) flush();
  return out;
}

export function TimeGrid({
  days,
  dayStart = CALENDAR_DAY_START,
  dayEnd = CALENDAR_DAY_END,
  today,
  nowMinutes,
  itemsByDay,
  onCreate,
  onOpen,
  onDragStart,
  onDrawStart,
  drawn,
  activeKey,
  className,
}: {
  days: string[];
  dayStart?: number;
  dayEnd?: number;
  today: string;
  nowMinutes: number;
  itemsByDay: Map<string, CalendarItem[]>;
  onCreate: (date: string, startMinute: number | null) => void;
  onOpen: (item: CalendarItem) => void;
  onDragStart?: DragStart;
  onDrawStart?: DrawStart;
  drawn?: DrawPreview | null;
  activeKey?: string | null;
  className?: string;
}) {
  const timedStarts: number[] = [];
  const timedEnds: number[] = [];
  for (const d of days)
    for (const i of itemsByDay.get(d) ?? [])
      if (i.task.startMinute !== null && i.task.endMinute !== null) {
        timedStarts.push(Math.floor(i.task.startMinute / 60) * 60);
        timedEnds.push(Math.ceil(i.task.endMinute / 60) * 60);
      }
  const scale = gridScale(
    Math.max(CALENDAR_DAY_START, Math.min(dayStart, ...timedStarts)),
    Math.min(CALENDAR_DAY_END, Math.max(dayEnd, ...timedEnds)),
  );
  const { frac, slots: SLOTS, span: SPAN } = scale;
  const columns = { gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` };
  const hoursStyle = {
    ...columns,
    "--grid-min": `${SLOTS * SLOT_HEIGHT + 2 * GRID_PAD}px`,
    "--grid-min-lg": `${SLOTS * MIN_SLOT_HEIGHT + 2 * GRID_PAD}px`,
  } as CSSProperties;
  const single = days.length === 1;

  return (
    <div className={cn(SURFACE_FRAME, "flex flex-col overflow-hidden", className)}>
      <div className="grid border-b bg-surface-raised" style={columns}>
        <div />
        {days.map((d) => (
          <div
            key={d}
            className={cn(
              "flex h-11 items-center gap-2 border-l px-3",
              single ? "justify-start" : "justify-center",
              d === today && !single && "bg-calendar-today-head",
            )}
          >
            <span className={cn(TABLE_HEAD_TEXT, "uppercase tracking-wide")}>
              {single ? formatDayWithWeekday(d) : formatWeekdayShort(d).replace(".", "")}
            </span>
            {!single && (
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                  d === today && "bg-primary font-semibold text-primary-foreground",
                )}
              >
                {Number(d.slice(8, 10))}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="grid border-b" style={columns}>
        <div className="flex items-start justify-end px-2 pt-2 text-[0.6875rem] text-muted-foreground select-none">
          Cel dan
        </div>
        {days.map((d) => {
          const allDay = (itemsByDay.get(d) ?? []).filter((i) => i.task.startMinute === null);
          return (
            <div
              key={d}
              data-tint=""
              onPointerMove={onTintCursorMovePlate}
              onPointerLeave={onTintCursorLeave}
              onClick={() => onCreate(d, null)}
              aria-label={`${formatDayWithWeekday(d)}, cel dan`}
              data-cal-day={d}
              data-cal-kind="allday"
              className={cn(
                TINT_SHAPE_AREA,
                "flex min-h-9 min-w-0 flex-col gap-1 border-l p-1",
                d === today && !single && "bg-calendar-today-col",
              )}
            >
              {allDay.map((item) => (
                <TaskChip
                  key={itemKey(item)}
                  item={item}
                  showTime={false}
                  onOpen={onOpen}
                  onDragStart={onDragStart}
                  dragging={activeKey === itemKey(item)}
                />
              ))}
            </div>
          );
        })}
      </div>

      <div
        className="grid flex-1 min-h-[var(--grid-min)] lg:min-h-[var(--grid-min-lg)]"
        style={hoursStyle}
      >
        <div className="relative select-none">
          {Array.from({ length: SLOTS / 2 + 1 }, (_, h) => {
            const minute = scale.start + h * 60;
            return (
              <span
                key={minute}
                className="absolute right-2 -translate-y-1/2 text-[0.6875rem] tabular-nums text-muted-foreground"
                style={{ top: inPadded(frac(minute)) }}
              >
                {formatMinutes(minute)}
              </span>
            );
          })}
        </div>
        {days.map((d) => {
          const placed = layoutDay(itemsByDay.get(d) ?? []);
          const showNow = d === today && nowMinutes >= scale.start && nowMinutes <= scale.end;
          return (
            <div
              key={d}
              className={cn("relative min-w-0 border-l", d === today && !single && "bg-calendar-today-col")}
            >
              <div
                className="absolute inset-x-0 flex flex-col border-b"
                style={{ top: GRID_PAD, bottom: GRID_PAD }}
                data-cal-day={d}
                data-cal-kind="time"
                data-cal-start={scale.start}
                data-cal-end={scale.end}
              >
                {Array.from({ length: SLOTS }, (_, s) => {
                  const minute = scale.start + s * SLOT_MINUTES;
                  return (
                    <div
                      key={minute}
                      data-tint=""
                      onPointerMove={onTintCursorMovePlate}
                      onPointerLeave={onTintCursorLeave}
                      onClick={() => onCreate(d, minute)}
                      onPointerDown={onDrawStart ? (e) => onDrawStart(e, d) : undefined}
                      aria-label={`${formatDayWithWeekday(d)}, ${formatMinutes(minute)}`}
                      className={cn(
                        TINT_SHAPE_FIELD,
                        "min-h-0 flex-1",
                        onDrawStart && "cursor-cell",
                        minute % 60 === 0 ? "border-t" : "border-t border-dashed border-border/60",
                      )}
                    />
                  );
                })}

                <div className="pointer-events-none absolute inset-0">
                  {placed.map((p) => {
                    const start = p.task.startMinute!;
                    const length = p.task.endMinute! - start;
                    const shown = Math.max(length, SLOT_MINUTES);
                    return (
                      <TaskBlock
                        key={itemKey(p)}
                        item={p}
                        onOpen={onOpen}
                        onDragStart={onDragStart}
                        dragging={activeKey === itemKey(p)}
                        roomy={length >= SLOT_MINUTES * 3}
                        style={{
                          top: `calc(${frac(start) * 100}% + 1px)`,
                          height: `calc(${(shown / SPAN) * 100}% - 2px)`,
                          left: `calc(${(p.col / p.cols) * 100}% + 2px)`,
                          width: `calc(${100 / p.cols}% - 4px)`,
                        }}
                      />
                    );
                  })}
                  {drawn?.date === d && <DrawnBlock range={drawn} scale={scale} />}
                  {showNow && (
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 h-px bg-destructive"
                      style={{ top: `${frac(nowMinutes) * 100}%` }}
                    >
                      <span className="absolute -top-1 -left-1 size-2 rounded-full bg-destructive" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DrawnBlock({ range, scale }: { range: DrawPreview; scale: GridScale }) {
  const { frac, span: SPAN } = scale;
  const length = range.endMinute - range.startMinute;
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0.5 z-10 flex flex-col overflow-hidden rounded-md bg-background px-1.5 py-0.5 text-xs shadow-md ring-2 shadow-halo-medium ring-ring/60"
      style={{
        top: `calc(${frac(range.startMinute) * 100}% + 1px)`,
        height: `calc(${(length / SPAN) * 100}% - 2px)`,
      }}
    >
      <span className="truncate font-medium tabular-nums">
        {formatMinutes(range.startMinute)}–{formatMinutes(range.endMinute)}
      </span>
      <span className="truncate text-muted-foreground">Novo opravilo</span>
    </div>
  );
}
