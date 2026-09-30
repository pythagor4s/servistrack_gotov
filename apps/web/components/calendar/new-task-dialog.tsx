"use client";

import { useMemo } from "react";
import type { AppUser, CalendarCategory, Machine, Servicer } from "@/lib/types";
import { apiPost } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useMutate } from "@/lib/use-mutate";
import { nextWorkday, notifyCalendarChanged } from "@/lib/calendar";
import { TaskDialog } from "@/components/calendar/task-dialog";

export function NewTaskDialog({
  open,
  onOpenChange,
  date,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
}) {
  const { data: categories } = useApi<CalendarCategory[]>(open ? "/calendar/categories" : null);
  const { data: machines } = useApi<Machine[]>(open ? "/machines" : null);
  const { data: servicers } = useApi<Servicer[]>(open ? "/servicers" : null);
  const { data: users } = useApi<AppUser[]>(open ? "/users" : null);
  const { run, busy } = useMutate(notifyCalendarChanged);
  const draft = useMemo(
    () => (open ? { date: nextWorkday(date), startMinute: 10 * 60 } : null),
    [open, date],
  );

  return (
    <TaskDialog
      open={open}
      onOpenChange={onOpenChange}
      draft={draft}
      categories={categories ?? []}
      machines={machines ?? []}
      servicers={servicers ?? []}
      users={users ?? []}
      busy={busy}
      onSubmit={(values) =>
        run(() => apiPost("/calendar/tasks", values), "Opravilo dodano").then(() =>
          onOpenChange(false),
        )
      }
    />
  );
}
