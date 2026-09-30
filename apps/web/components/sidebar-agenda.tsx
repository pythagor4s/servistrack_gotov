"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CircleAlert, ExclamationMark, ExclamationMarkSlash, Plus } from "@/components/icons";

import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/useApi";
import {
  CALENDAR_CHANGED,
  formatMinutes,
  isOverdue,
  overdueRange,
  todayLocal,
} from "@/lib/calendar";
import type { CalendarTasksResponse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { onTintCursorLeave, onTintCursorMovePlate } from "@/components/hover-tint";
import { SidebarSection } from "@/components/sidebar-section";
import { colorMetaOf } from "@/components/calendar/calendar-meta";
import { NewTaskDialog } from "@/components/calendar/new-task-dialog";

const VISIBLE = 5;

const HIDE_OVERDUE_KEY = "servis-track:sidebar:hide-overdue";

const HEAD_BUTTON =
  "flex size-6 items-center justify-center rounded-md text-foreground-faint transition-[color,opacity] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none";

export function SidebarAgenda() {
  const { isAdmin } = useAuth();
  const [today, setToday] = useState(todayLocal);
  useEffect(() => {
    const id = setInterval(() => setToday(todayLocal()), 60_000);
    return () => clearInterval(id);
  }, []);

  const [hideOverdue, setHideOverdue] = useState(false);
  const [creating, setCreating] = useState(false);
  const [overdueAnimated, setOverdueAnimated] = useState(false);
  useEffect(() => {
    try {
      setHideOverdue(window.localStorage.getItem(HIDE_OVERDUE_KEY) === "1");
    } catch {
    }
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setOverdueAnimated(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);
  const toggleOverdue = () => {
    const next = !hideOverdue;
    setHideOverdue(next);
    try {
      window.localStorage.setItem(HIDE_OVERDUE_KEY, next ? "1" : "0");
    } catch {
    }
  };

  const { from, to } = overdueRange(today);
  const { data, refetch } = useApi<CalendarTasksResponse>(
    isAdmin ? `/calendar/tasks?from=${from}&to=${to}` : null,
  );

  useEffect(() => {
    const onChange = () => void refetch();
    window.addEventListener(CALENDAR_CHANGED, onChange);
    return () => window.removeEventListener(CALENDAR_CHANGED, onChange);
  }, [refetch]);

  const { todayItems, overdueCount } = useMemo(() => {
    if (!data) return { todayItems: [], overdueCount: 0 };
    const byId = new Map(data.tasks.map((t) => [t.id, t]));
    const pairs = data.occurrences.flatMap((occurrence) => {
      const task = byId.get(occurrence.taskId);
      return task ? [{ task, occurrence }] : [];
    });
    return {
      todayItems: pairs.filter((p) => p.occurrence.date === today),
      overdueCount: pairs.filter((p) => isOverdue(p.occurrence, p.task, today)).length,
    };
  }, [data, today]);

  if (!isAdmin) return null;

  const dayHref = `/opravila?view=day&date=${today}`;
  const hidden = todayItems.length - VISIBLE;
  const shown = hidden === 1 ? todayItems : todayItems.slice(0, VISIBLE);
  const row = "group relative flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-nav-foreground hover:text-foreground";
  const row2 = cn(row, "bg-destructive/10");

  return (
    <>
      <div className="group/agenda select-none px-2">
      <SidebarSection
        label="Aktivnosti danes"
        action={
          <div className="mr-1 flex items-center">
            {overdueCount > 0 && (
              <button
                type="button"
                onClick={toggleOverdue}
                aria-pressed={hideOverdue}
                aria-label={hideOverdue ? "Pokaži zamujene" : "Skrij zamujene"}
                title={hideOverdue ? "Pokaži zamujene" : "Skrij zamujene"}
                className={cn(HEAD_BUTTON, "opacity-0 group-hover/agenda:opacity-100 focus-visible:opacity-100")}
              >
                {hideOverdue ? (
                  <ExclamationMarkSlash className="size-4" />
                ) : (
                  <ExclamationMark className="size-4" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setCreating(true)}
              aria-label="Novo opravilo"
              title="Novo opravilo"
              className={HEAD_BUTTON}
            >
              <Plus className="size-4" />
            </button>
          </div>
        }
      >
      {todayItems.length > 0 && (
        <>
          <div>
            {shown.map(({ task, occurrence }) => {
              const done = !!occurrence.completion;
              const dot = colorMetaOf(task.category?.color).dot;
              return (
                <Link
                  key={task.id}
                  href={dayHref}
                  data-tint=""
                  onPointerMove={onTintCursorMovePlate}
                  onPointerLeave={onTintCursorLeave}
                  className={row}
                >

                    <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center">
                      <span
                        className={cn(
                          "size-2 rounded-full transition-transform duration-400 ease-out group-hover:scale-[1.35] motion-reduce:transition-none",
                          dot,
                          done && "opacity-40",
                        )}
                      />
                    </span>

                  <span
                    className={cn(
                      "min-w-0 flex-1 overflow-hidden whitespace-nowrap mask-r-from-[calc(100%-2rem)]",
                      done && "text-foreground-faint line-through",
                    )}
                  >
                    {task.title}
                  </span>
                  <span
                    aria-hidden="true"
                    className="-ml-2 max-w-0 shrink-0 overflow-hidden transition-[max-width] duration-200 ease-out group-hover:max-w-16 group-focus-visible:max-w-16 motion-reduce:transition-none"
                  >
                    <span className="invisible block whitespace-nowrap pl-2 tabular-nums">
                      {task.startMinute === null ? "cel dan" : formatMinutes(task.startMinute)}
                    </span>
                  </span>
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 translate-x-[15%] whitespace-nowrap tabular-nums text-nav-foreground opacity-0 transition-[translate,opacity] duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none">
                    {task.startMinute === null ? "cel dan" : formatMinutes(task.startMinute)}
                  </span>
                </Link>
              );
            })}
            {hidden > 1 && (
              <Link
                href={dayHref}
                data-tint=""
                onPointerMove={onTintCursorMovePlate}
                onPointerLeave={onTintCursorLeave}
                className={row}
              >
                <span className="size-5 shrink-0" aria-hidden="true" />
                <span className="flex-1">+{hidden} več</span>
              </Link>
            )}
          </div>
        </>
      )}

      {overdueCount > 0 && (
        <div
          inert={hideOverdue}
          className={cn(
            "grid motion-reduce:transition-none",
            overdueAnimated && "transition-[grid-template-rows,opacity] duration-300 ease-out",
            hideOverdue ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <Link
              href="/opravila?view=list&filter=overdue"
              data-tint=""
              onPointerMove={onTintCursorMovePlate}
              onPointerLeave={onTintCursorLeave}
              className={row2}
            >
              <CircleAlert className="size-5 shrink-0 text-destructive" />
              <span className="min-w-0 flex-1 truncate text-destructive">Zamujeno:</span>
              <span className="shrink-0 tabular-nums text-destructive">{overdueCount}</span>
            </Link>
          </div>
        </div>
      )}

      {todayItems.length === 0 && (overdueCount === 0 || hideOverdue) && (
        <p className="px-3 py-2 text-sm text-foreground-faint">Za danes ni opravil.</p>
      )}
      <div className="h-1" />
      </SidebarSection>
      </div>
      <NewTaskDialog open={creating} onOpenChange={setCreating} date={today} />
    </>
  );
}
