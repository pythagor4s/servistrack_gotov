"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  Clock,
  LayoutList,
  Pencil,
  Repeat,
  Shapes,
  User,
  Wrench,
  type IconComponent,
} from "@/components/icons";

import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatDayWithWeekday, isOverdue, recurrenceSummary, taskTimeLabel } from "@/lib/calendar";
import type { CalendarPerson } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PropertyList, PropertyRow } from "@/components/ui/property-list";
import { Separator } from "@/components/ui/separator";
import { DoneToggle } from "@/components/calendar/done-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { colorMetaOf } from "@/components/calendar/calendar-meta";
import type { CalendarItem } from "@/components/calendar/task-chip";

const personName = (p: { name: string | null; username: string }) => p.name ?? p.username;

const wasEdited = (t: { createdAt: string; updatedAt: string }) =>
  new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime() > 1000;

const avatarUser = (p: CalendarPerson) => ({
  id: p.id,
  name: p.name,
  username: p.username,
  hasImage: p.image != null,
  imageUpdatedAt: p.image?.updatedAt ?? null,
});

export function TaskDetailDialog({
  item,
  today,
  onOpenChange,
  onEdit,
  onToggleDone,
}: {
  item: CalendarItem | null;
  today: string;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onToggleDone: (done: boolean) => Promise<unknown>;
}) {
  if (!item) return null;
  const { task, occurrence } = item;
  const completion = occurrence.completion;
  const late = isOverdue(occurrence, task, today);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[26rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="size-5 shrink-0" />
            Opravilo
          </DialogTitle>
          <DialogDescription className="sr-only">
            {task.title}, {formatDayWithWeekday(occurrence.date)}, {taskTimeLabel(task)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <h3 className="px-3 text-lg leading-snug font-semibold wrap-anywhere">{task.title}</h3>

          <PropertyList>
            <PropertyRow label="Kategorija">
              <Value empty={!task.category}>
                {task.category ? (
                  <span className="flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
                    <span className={cn("size-2.5 rounded-full", colorMetaOf(task.category.color).dot)} />
                  </span>
                ) : (
                  <ValueIcon icon={Shapes} />
                )}
                <span className="truncate">{task.category?.name ?? "Brez kategorije"}</span>
              </Value>
            </PropertyRow>

            <PropertyRow label="Sredstvo">
              <Value empty={!task.machine}>
                <ValueIcon icon={LayoutList} />
                {task.machine ? (
                  <Link
                    href={`/sredstva?machine=${task.machine.id}`}
                    className="min-w-0 truncate underline-offset-4 transition-colors hover:text-link hover:underline"
                  >
                    {task.machine.brand} {task.machine.model}
                  </Link>
                ) : (
                  <span className="truncate">Brez sredstva</span>
                )}
              </Value>
            </PropertyRow>

            <PropertyRow label="Serviser">
              <Value empty={!task.servicer}>
                <ValueIcon icon={Wrench} />
                <span className="truncate">{task.servicer?.name ?? "Brez serviserja"}</span>
              </Value>
            </PropertyRow>

            <PropertyRow label="Odgovorna oseba">
              <Value empty={!task.assignee}>
                {task.assignee ? (
                  <UserAvatar user={avatarUser(task.assignee)} className="size-5" iconClassName="size-3" />
                ) : (
                  <ValueIcon icon={User} />
                )}
                <span className="truncate">{task.assignee ? personName(task.assignee) : "Nihče"}</span>
              </Value>
            </PropertyRow>

            <PropertyRow label="Dan">
              <Value>
                <ValueIcon icon={CalendarDays} />
                <span className="truncate">{formatDayWithWeekday(occurrence.date)}</span>
              </Value>
            </PropertyRow>

            <PropertyRow label="Čas">
              <Value>
                <ValueIcon icon={task.startMinute === null ? CalendarDays : Clock} />
                <span className="tabular-nums">{taskTimeLabel(task)}</span>
              </Value>
            </PropertyRow>

            <PropertyRow label="Ponavljanje">
              <Value empty={!task.recurrenceUnit}>
                <ValueIcon icon={Repeat} />
                <span className="truncate">{recurrenceSummary(task)}</span>
              </Value>
            </PropertyRow>

            <PropertyRow label="Ustvaril">
              <Value>
                {task.createdBy ? (
                  <UserAvatar user={avatarUser(task.createdBy)} className="size-5" iconClassName="size-3" />
                ) : (
                  <ValueIcon icon={User} />
                )}
                <span className="truncate">{task.createdBy ? personName(task.createdBy) : "Neznan avtor"}</span>
                <span className="shrink-0 text-nav-foreground tabular-nums">
                  {formatDate(task.createdAt)}
                  {wasEdited(task) ? ` · urejeno ${formatDate(task.updatedAt)}` : ""}
                </span>
              </Value>
            </PropertyRow>
          </PropertyList>

          {task.notes && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Opombe</p>
                <p className="text-sm wrap-anywhere whitespace-pre-wrap">{task.notes}</p>
              </div>
            </>
          )}

          <DoneToggle
            key={`${task.id}|${occurrence.date}`}
            done={!!completion}
            description={
              completion
                ? `${completion.completedBy ? personName(completion.completedBy) : "Neznan uporabnik"}, ${formatDateTime(completion.completedAt)}`
                : late
                  ? "Zamujeno – ta ponovitev še ni označena kot opravljena."
                  : undefined
            }
            onToggle={onToggleDone}
          />

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              Zapri
            </Button>
            <Button
              className="w-full"
              onClick={onEdit}
              title={task.recurrenceUnit ? "Sprememba velja za vse ponovitve" : undefined}
            >
              <Pencil className="size-4" /> Uredi
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Value({ empty = false, children }: { empty?: boolean; children: ReactNode }) {
  return (
    <span className={cn("flex h-8 min-w-0 items-center gap-2 text-sm", empty && "text-muted-foreground")}>
      {children}
    </span>
  );
}

function ValueIcon({ icon: Icon }: { icon: IconComponent }) {
  return <Icon className="size-4 shrink-0 text-nav-foreground" />;
}
