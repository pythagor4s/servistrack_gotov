"use client";

import { useEffect, useMemo, useState } from "react";

import { ClipboardList } from "@/components/icons";
import { useApi } from "@/lib/useApi";
import {
  CALENDAR_CHANGED,
  formatDayWithWeekday,
  isOverdue,
  taskTimeLabel,
  weekDays,
} from "@/lib/calendar";
import type { CalendarTasksResponse } from "@/lib/types";
import { itemKey, type CalendarItem } from "@/components/calendar/task-chip";
import { EmptyNote, SectionTitle } from "@/components/detail-parts";
import { FadeText } from "@/components/ui/fade-text";
import { AnimatedCircleCheck } from "@/components/calendar/done-toggle";
import { cn } from "@/lib/utils";

export function WeekTaskList({
  anchor,
  today,
  categoryFilter,
  onOpen,
  onToggle,
}: {
  anchor: string;
  today: string;
  categoryFilter: (item: CalendarItem) => boolean;
  onOpen: (item: CalendarItem) => void;
  onToggle: (item: CalendarItem, done: boolean) => Promise<unknown>;
}) {
  const days = weekDays(anchor);
  const from = days[0]!;
  const to = days[days.length - 1]!;
  const { data, refetch } = useApi<CalendarTasksResponse>(`/calendar/tasks?from=${from}&to=${to}`);
  useEffect(() => {
    const onChange = () => void refetch();
    window.addEventListener(CALENDAR_CHANGED, onChange);
    return () => window.removeEventListener(CALENDAR_CHANGED, onChange);
  }, [refetch]);

  const items = useMemo<CalendarItem[]>(() => {
    if (!data) return [];
    const byId = new Map(data.tasks.map((t) => [t.id, t]));
    return data.occurrences
      .flatMap((occurrence) => {
        const task = byId.get(occurrence.taskId);
        return task ? [{ task, occurrence }] : [];
      })
      .filter(categoryFilter)
      .sort(
        (a, b) =>
          a.occurrence.date.localeCompare(b.occurrence.date) ||
          (a.task.startMinute ?? -1) - (b.task.startMinute ?? -1),
      );
  }, [data, categoryFilter]);

  const done = items.filter((i) => i.occurrence.completion).length;

  return (
    <section className="space-y-4">
      <SectionTitle
        bare
        action={
          items.length > 0 && (
            <span className="text-sm text-nav-foreground tabular-nums">
              {done} / {items.length}
            </span>
          )
        }
      >
        Ta teden
      </SectionTitle>
      {data && items.length === 0 ? (
        <EmptyNote icon={ClipboardList} title="Ta teden ni opravil">
          Dodajte jih z gumbom Novo opravilo.
        </EmptyNote>
      ) : (
        <div className="space-y-4">
          {days.map((d) => {
            const dayItems = items.filter((i) => i.occurrence.date === d);
            if (dayItems.length === 0) return null;
            return (
              <div key={d}>
                <p
                  className={cn(
                    "pb-1 text-xs font-medium text-nav-foreground select-none first-letter:uppercase",
                    d === today && "text-foreground",
                  )}
                >
                  {formatDayWithWeekday(d)}
                  {d === today && " · danes"}
                </p>
                <ul>
                  {dayItems.map((item) => (
                    <TaskRow
                      key={itemKey(item)}
                      item={item}
                      overdue={isOverdue(item.occurrence, item.task, today)}
                      onOpen={() => onOpen(item)}
                      onToggle={(v) => onToggle(item, v).then(() => refetch())}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function TaskRow({
  item,
  overdue,
  onOpen,
  onToggle,
}: {
  item: CalendarItem;
  overdue: boolean;
  onOpen: () => void;
  onToggle: (done: boolean) => Promise<unknown>;
}) {
  const { task, occurrence } = item;
  const [pending, setPending] = useState<boolean | null>(null);
  const checked = pending ?? !!occurrence.completion;
  const note = task.notes?.split("\n").find((l) => l.trim())?.trim() ?? null;

  return (
    <li className="-mx-2 flex min-h-9 items-center gap-3 rounded-md px-2 py-1 text-sm transition-colors hover:bg-surface-hover">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={checked ? "Odznači opravljeno" : "Označi kot opravljeno"}
        onClick={() => {
          const next = !checked;
          setPending(next);
          void onToggle(next).finally(() => setPending(null));
        }}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
          checked ? "text-nav-foreground" : "text-input hover:text-muted-foreground",
        )}
      >
        <AnimatedCircleCheck checked={checked} className="size-4.5" />
      </button>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className={cn("block truncate", checked && "text-nav-foreground line-through")}>{task.title}</span>
        {note && <FadeText className="text-xs text-nav-foreground">{note}</FadeText>}
      </button>
      <span
        className={cn(
          "shrink-0 text-xs tabular-nums",
          overdue ? "text-priority-high" : "text-nav-foreground",
        )}
      >
        {taskTimeLabel(task)}
      </span>
    </li>
  );
}
