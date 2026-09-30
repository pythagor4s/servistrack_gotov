"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useDevicePrefs } from "@/lib/device-prefs";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, X } from "@/components/icons";
import { addDays, dayNumber, isDateOnly, OVERDUE_WINDOW_DAYS } from "@servis-track/shared";
import { toast } from "sonner";

import { apiDelete, apiPatch, apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/useApi";
import { useMutate } from "@/lib/use-mutate";
import { useIsDesktop } from "@/lib/use-media";
import { taskCountLabel } from "@/lib/format";
import {
  CALENDAR_VIEW_KEY,
  CALENDAR_VIEWS,
  isOffDay,
  isOverdue,
  monthWorkdays,
  nextWorkday,
  CALENDAR_CHANGED,
  notifyCalendarChanged,
  nowMinutesLocal,
  overdueRange,
  rangeLabel,
  shiftAnchor,
  todayLocal,
  viewRange,
  weekDays,
  type CalendarView,
} from "@/lib/calendar";
import type {
  AppUser,
  CalendarCategory,
  CalendarTask,
  CalendarTasksResponse,
  Machine,
  Servicer,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import type { ComboboxOption } from "@/components/ui/combobox";
import { BarCircle, MobileBarActions } from "@/components/mobile-action-bar";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { MonthView } from "@/components/calendar/month-view";
import { TimeGrid } from "@/components/calendar/time-grid";
import { AgendaView } from "@/components/calendar/agenda-view";
import { itemKey, type CalendarItem } from "@/components/calendar/task-chip";
import { DeleteTaskDialog, TaskDialog, type TaskDraft } from "@/components/calendar/task-dialog";
import { TaskDetailDialog } from "@/components/calendar/task-detail-dialog";
import { WeekTaskList } from "@/components/calendar/week-task-list";
import { CALENDAR_COLOR_META } from "@/components/calendar/calendar-meta";
import { PAGE_ASIDE, PAGE_ASIDE_INNER, PAGE_MAIN, PAGE_WITH_ASIDE } from "@/lib/page-layout";
import { cn } from "@/lib/utils";
import { useCalendarDrag } from "@/components/calendar/use-calendar-drag";

const ALL = "ALL";
const NO_CATEGORY = "NONE";

export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <CalendarPageInner />
    </Suspense>
  );
}

function CalendarPageInner() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const isDesktop = useIsDesktop(true);

  const [today, setToday] = useState(todayLocal);
  const [nowMinutes, setNowMinutes] = useState(nowMinutesLocal);
  useEffect(() => {
    const id = setInterval(() => {
      setToday(todayLocal());
      setNowMinutes(nowMinutesLocal());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const requestedView = params.get("view") as CalendarView | null;
  const devicePrefs = useDevicePrefs();
  const [savedView, setSavedView] = useState<CalendarView | null>(null);
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(CALENDAR_VIEW_KEY) as CalendarView | null;
      if (v && CALENDAR_VIEWS.includes(v)) setSavedView(v);
    } catch {
    }
  }, []);
  const baseView: CalendarView =
    requestedView && CALENDAR_VIEWS.includes(requestedView)
      ? requestedView
      : isDesktop
        ? (savedView ?? "week")
        : "list";
  const view: CalendarView =
    !isDesktop && (baseView === "month" || baseView === "week") ? "list" : baseView;
  const dateParam = params.get("date");
  const rawAnchor = dateParam && isDateOnly(dateParam) ? dateParam : today;
  const anchor = view === "day" ? nextWorkday(rawAnchor) : rawAnchor;
  const overdueOnly = params.get("filter") === "overdue";

  function setUrl(next: { view?: CalendarView; date?: string; overdue?: boolean }) {
    const q = new URLSearchParams(params.toString());
    if (next.view) q.set("view", next.view);
    if (next.date) q.set("date", next.date);
    if (next.overdue !== undefined) {
      if (next.overdue) q.set("filter", "overdue");
      else q.delete("filter");
    }
    router.replace(`/opravila?${q.toString()}`, { scroll: false });
  }

  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const range = overdueOnly ? overdueRange(today) : viewRange(view, anchor);
  const { data, error, refetch } = useApi<CalendarTasksResponse>(
    isAdmin ? `/calendar/tasks?from=${range.from}&to=${range.to}` : null,
  );
  const { data: categories } = useApi<CalendarCategory[]>(isAdmin ? "/calendar/categories" : null);
  const { data: machines } = useApi<Machine[]>(isAdmin ? "/machines" : null);
  const { data: servicers } = useApi<Servicer[]>(isAdmin ? "/servicers" : null);
  const { data: users } = useApi<AppUser[]>(isAdmin ? "/users" : null);

  useEffect(() => {
    const onChange = () => void refetch();
    window.addEventListener(CALENDAR_CHANGED, onChange);
    return () => window.removeEventListener(CALENDAR_CHANGED, onChange);
  }, [refetch]);

  const { run, busy } = useMutate(async () => {
    await refetch();
    notifyCalendarChanged();
  });

  const [creating, setCreating] = useState<TaskDraft | null>(null);

  const drag = useCalendarDrag(async (p, { task, occurrence }) => {
    const shift = dayNumber(p.date) - dayNumber(occurrence.date);
    const date = addDays(task.date, shift);
    if (isOffDay(date)) {
      toast.error("Začetek serije bi padel na soboto ali nedeljo – premik ni mogoč.");
      return;
    }
    const recurrenceUntil =
      task.recurrenceUntil && shift !== 0 ? addDays(task.recurrenceUntil, shift) : task.recurrenceUntil;
    await run(
      () =>
        apiPatch(`/calendar/tasks/${task.id}`, {
          date,
          startMinute: p.startMinute,
          endMinute: p.endMinute,
          ...(task.recurrenceUnit ? { recurrenceUntil } : {}),
        }),
      task.recurrenceUnit ? "Premaknjeno – velja za vse ponovitve" : "Opravilo premaknjeno",
    );
  }, setCreating);
  const drawn =
    drag.drawing ??
    (creating && creating.startMinute !== null && creating.endMinute !== undefined
      ? { date: creating.date, startMinute: creating.startMinute, endMinute: creating.endMinute }
      : null);

  const allItems: CalendarItem[] = useMemo(() => {
    if (!data) return [];
    const byId = new Map(data.tasks.map((t) => [t.id, t]));
    const p = drag.preview;
    return data.occurrences.flatMap((occurrence) => {
      const task = byId.get(occurrence.taskId);
      if (!task) return [];
      if (p && task.id === p.taskId && occurrence.date === p.fromDate) {
        return [
          {
            task: { ...task, startMinute: p.startMinute, endMinute: p.endMinute },
            occurrence: { ...occurrence, date: p.date },
          },
        ];
      }
      return [{ task, occurrence }];
    });
  }, [data, drag.preview]);
  const activeKey = drag.preview ? `${drag.preview.taskId}|${drag.preview.date}` : null;

  const matchesCategory = useCallback(
    (i: CalendarItem) => {
      if (categoryFilter === NO_CATEGORY && i.task.categoryId !== null) return false;
      if (categoryFilter !== ALL && categoryFilter !== NO_CATEGORY && i.task.categoryId !== categoryFilter) {
        return false;
      }
      return true;
    },
    [categoryFilter],
  );
  const showCompleted = devicePrefs.showCompletedTasks;
  const items = useMemo(
    () =>
      allItems.filter(
        (i) =>
          matchesCategory(i) &&
          (showCompleted || !i.occurrence.completion) &&
          (!overdueOnly || isOverdue(i.occurrence, i.task, today)),
      ),
    [allItems, matchesCategory, showCompleted, overdueOnly, today],
  );

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const list = map.get(item.occurrence.date);
      if (list) list.push(item);
      else map.set(item.occurrence.date, [item]);
    }
    return map;
  }, [items]);

  const categoryOptions: ComboboxOption[] = useMemo(
    () => [
      { value: ALL, label: "Vse kategorije" },
      ...(categories ?? []).map((c) => ({
        value: c.id,
        label: c.name,
        swatchClassName: CALENDAR_COLOR_META[c.color].dot,
      })),
      { value: NO_CATEGORY, label: "Brez kategorije" },
    ],
    [categories],
  );

  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<CalendarTask | null>(null);
  const [deleting, setDeleting] = useState<CalendarTask | null>(null);
  const detail = detailKey ? (allItems.find((i) => itemKey(i) === detailKey) ?? null) : null;

  if (!isAdmin) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Ta stran je namenjena administratorjem.
      </p>
    );
  }

  const openCreate = (date: string, startMinute: number | null = 10 * 60) => {
    if (drag.isClickSuppressed()) return;
    setCreating({ date: nextWorkday(date), startMinute });
  };
  const openDetail = (item: CalendarItem) => {
    if (drag.isClickSuppressed()) return;
    setDetailKey(itemKey(item));
  };

  return (
    <div className={PAGE_WITH_ASIDE}>
    <div className={cn(PAGE_MAIN, "space-y-4 lg:flex lg:flex-col")}>
      <CalendarToolbar
        view={view}
        onViewChange={(v) => setUrl({ view: v, date: anchor, overdue: false })}
        label={overdueOnly ? "Zamujena opravila" : rangeLabel(view, anchor)}
        onToday={() => setUrl({ view, date: today, overdue: false })}
        onStep={(dir) => setUrl({ view, date: shiftAnchor(view, anchor, dir), overdue: false })}
        categoryOptions={categoryOptions}
        categoryFilter={categoryFilter}
        onCategoryFilter={setCategoryFilter}
        onCreate={() => openCreate(view === "day" ? anchor : today)}
      />

      {overdueOnly && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg  bg-card px-4 py-3 text-sm">
          <span>
            Neopravljeno v zadnjih {OVERDUE_WINDOW_DAYS} dneh:{" "}
            <span className="font-medium tabular-nums">
              {items.length} {taskCountLabel(items.length)}
            </span>
          </span>
          <Button variant="outline" size="sm" onClick={() => setUrl({ view: "list", date: today, overdue: false })}>
            <X className="size-4" /> Pokaži vse
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {view === "list" || overdueOnly ? (
        <AgendaView
          items={items}
          today={today}
          emptyText={
            overdueOnly
              ? "Zamujenih opravil ni."
              : "V teh 31 dneh ni opravil. Dodajte prvo z gumbom Novo opravilo."
          }
          onOpen={openDetail}
          onEdit={(item) => setEditing(item.task)}
          onToggle={(item, done) =>
            run(
              () =>
                done
                  ? apiPost(`/calendar/tasks/${item.task.id}/completions`, { date: item.occurrence.date })
                  : apiDelete(`/calendar/tasks/${item.task.id}/completions/${item.occurrence.date}`),
              done ? "Označeno kot opravljeno" : "Oznaka odstranjena",
            )
          }
        />
      ) : view === "month" ? (
        <MonthView
          days={monthWorkdays(anchor)}
          anchor={anchor}
          today={today}
          itemsByDay={itemsByDay}
          onCreate={(d) => openCreate(d)}
          onOpen={openDetail}
          onDragStart={drag.begin}
          activeKey={activeKey}
          className="lg:min-h-0 lg:flex-1"
        />
      ) : (
        <TimeGrid
          className="lg:flex-1"
          dayStart={devicePrefs.dayStart}
          dayEnd={devicePrefs.dayEnd}
          days={view === "week" ? weekDays(anchor) : [anchor]}
          today={today}
          nowMinutes={nowMinutes}
          itemsByDay={itemsByDay}
          onCreate={(d, minute) => openCreate(d, minute)}
          onOpen={openDetail}
          onDragStart={drag.begin}
          onDrawStart={drag.beginDraw}
          drawn={drawn}
          activeKey={activeKey}
        />
      )}

    </div>

      <aside className={PAGE_ASIDE}>
        <div className={PAGE_ASIDE_INNER}>
          <WeekTaskList
            anchor={anchor}
            today={today}
            categoryFilter={matchesCategory}
            onOpen={openDetail}
            onToggle={(item, done) =>
              run(
                () =>
                  done
                    ? apiPost(`/calendar/tasks/${item.task.id}/completions`, { date: item.occurrence.date })
                    : apiDelete(`/calendar/tasks/${item.task.id}/completions/${item.occurrence.date}`),
                done ? "Označeno kot opravljeno" : "Oznaka odstranjena",
              )
            }
          />
        </div>
      </aside>

      <MobileBarActions>
        <BarCircle label="Novo opravilo" variant="primary" onClick={() => openCreate(anchor)}>
          <Plus strokeWidth={2.1} />
        </BarCircle>
      </MobileBarActions>

      <TaskDialog
        open={creating !== null}
        onOpenChange={(v) => !v && setCreating(null)}
        draft={creating}
        categories={categories ?? []}
        machines={machines ?? []}
        servicers={servicers ?? []}
        users={users ?? []}
        busy={busy}
        onSubmit={(values) =>
          run(() => apiPost("/calendar/tasks", values), "Opravilo dodano").then(() =>
            setCreating(null),
          )
        }
      />

      <TaskDetailDialog
        item={detail}
        today={today}
        onOpenChange={(v) => !v && setDetailKey(null)}
        onEdit={() => {
          const target = detail?.task ?? null;
          setDetailKey(null);
          setEditing(target);
        }}
        onToggleDone={(done) => {
          if (!detail) return Promise.resolve();
          const { task, occurrence } = detail;
          return run(
            () =>
              done
                ? apiPost(`/calendar/tasks/${task.id}/completions`, { date: occurrence.date })
                : apiDelete(`/calendar/tasks/${task.id}/completions/${occurrence.date}`),
            done ? "Označeno kot opravljeno" : "Oznaka odstranjena",
          );
        }}
      />

      <TaskDialog
        open={editing !== null}
        onOpenChange={(v) => !v && setEditing(null)}
        initial={editing}
        categories={categories ?? []}
        machines={machines ?? []}
        servicers={servicers ?? []}
        users={users ?? []}
        busy={busy}
        onSubmit={(values) =>
          editing &&
          run(() => apiPatch(`/calendar/tasks/${editing.id}`, values), "Opravilo posodobljeno").then(
            () => setEditing(null),
          )
        }
        onRequestDelete={() => editing && setDeleting(editing)}
      />

      <DeleteTaskDialog
        task={deleting}
        busy={busy}
        onOpenChange={(v) => !v && setDeleting(null)}
        onConfirm={() =>
          deleting &&
          run(() => apiDelete(`/calendar/tasks/${deleting.id}`), "Opravilo izbrisano").then(() => {
            setDeleting(null);
            setEditing(null);
          })
        }
      />
    </div>
  );
}
