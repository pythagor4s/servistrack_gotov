"use client";

import { Fragment } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CalendarDays, CheckCircle2, CircleDot, ClipboardList, Clock, LayoutList, Pencil, Wrench } from "@/components/icons";
import { RowContextMenu } from "@/components/row-context-menu";
import { ContextMenuItem, ContextMenuLabel, ContextMenuSeparator } from "@/components/ui/context-menu";

import { cn } from "@/lib/utils";
import { formatDayWithWeekday, isOverdue, taskTimeLabel } from "@/lib/calendar";
import { onTintCursorMoveRow } from "@/components/hover-tint";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TABLE_FRAME,
} from "@/components/ui/table";
import { itemKey, type CalendarItem } from "@/components/calendar/task-chip";

const COLUMNS = 5;

export function AgendaView({
  items,
  today,
  emptyText,
  onOpen,
  onToggle,
  onEdit,
}: {
  items: CalendarItem[];
  today: string;
  emptyText: string;
  onOpen: (item: CalendarItem) => void;
  onToggle: (item: CalendarItem, done: boolean) => Promise<unknown>;
  onEdit: (item: CalendarItem) => void;
}) {
  const router = useRouter();
  if (items.length === 0) {
    return (
      <div className={cn(TABLE_FRAME, "px-4 py-10 text-center text-sm text-muted-foreground")}>
        {emptyText}
      </div>
    );
  }

  const byDay = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const list = byDay.get(item.occurrence.date);
    if (list) list.push(item);
    else byDay.set(item.occurrence.date, [item]);
  }

  let row = 0;
  return (
    <div className={TABLE_FRAME}>
      <Table>
        <TableHeader>
          <TableRow plain>
            <TableHead className="w-36" icon={Clock}>Čas</TableHead>
            <TableHead icon={ClipboardList}>Opravilo</TableHead>
            <TableHead icon={LayoutList}>Sredstvo</TableHead>
            <TableHead icon={Wrench}>Izvajalec</TableHead>
            <TableHead className="w-32" icon={CircleDot}>Stanje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...byDay.entries()].map(([date, dayItems]) => (
            <Fragment key={date}>
              <TableRow zebra={row++} plain className="h-auto">
                <TableCell colSpan={COLUMNS} className="h-auto py-2">
                  <span
                    className={cn(
                      "text-[0.6875rem] font-medium tracking-wider uppercase",
                      date === today ? "text-foreground" : "text-group-heading",
                    )}
                  >
                    {date === today ? "Danes · " : ""}
                    {formatDayWithWeekday(date)}
                  </span>
                </TableCell>
              </TableRow>
              {dayItems.map((item) => {
                const { task, occurrence } = item;
                const done = !!occurrence.completion;
                const late = isOverdue(occurrence, task, today);
                const performer = [
                  task.servicer?.name,
                  task.assignee ? (task.assignee.name ?? task.assignee.username) : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <RowContextMenu
                    key={itemKey(item)}
                    items={
                      <>
                        <ContextMenuLabel>{task.title}</ContextMenuLabel>
                        <ContextMenuItem onSelect={() => onOpen(item)}>
                          <ArrowUpRight /> Odpri
                        </ContextMenuItem>
                        <ContextMenuItem onSelect={() => void onToggle(item, !done)}>
                          <CheckCircle2 /> {done ? "Odstrani oznako opravljeno" : "Označi kot opravljeno"}
                        </ContextMenuItem>
                        <ContextMenuItem onSelect={() => router.push(`/opravila?view=day&date=${occurrence.date}`)}>
                          <CalendarDays /> Pokaži dan v koledarju
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem onSelect={() => onEdit(item)}>
                          <Pencil /> Uredi
                        </ContextMenuItem>
                      </>
                    }
                  >
                  <TableRow
                    zebra={row++}
                    data-row-tint="neutral"
                    onPointerMove={onTintCursorMoveRow}
                    role="button"
                    tabIndex={0}
                    aria-label={`${task.title}, ${taskTimeLabel(task)}`}
                    onClick={() => onOpen(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpen(item);
                      }
                    }}
                    className="outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    <TableCell className="tabular-nums text-muted-foreground">
                      {taskTimeLabel(task)}
                    </TableCell>
                    <TableCell className="max-w-80">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className={cn("truncate", done && "text-muted-foreground line-through")}>
                          {task.title}
                        </span>
                        {task.category && (
                          <span className="shrink-0 text-muted-foreground">· {task.category.name}</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-64 truncate text-muted-foreground">
                      {task.machine ? `${task.machine.brand} ${task.machine.model}` : "—"}
                    </TableCell>
                    <TableCell className="max-w-56 truncate text-muted-foreground">
                      {performer || "—"}
                    </TableCell>
                    <TableCell>
                      {done ? (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <CheckCircle2 className="size-4" /> Opravljeno
                        </span>
                      ) : late ? (
                        <span className="text-destructive">Zamujeno</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                  </RowContextMenu>
                );
              })}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
