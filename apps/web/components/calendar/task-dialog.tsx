"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  Clock,
  LayoutList,
  Repeat,
  Shapes,
  User,
  Wrench,
  Trash2,
} from "@/components/icons";
import {
  CALENDAR_DAY_END,
  CALENDAR_NOTES_MAX,
  CALENDAR_STEP,
  createCalendarTaskSchema,
  type RecurrenceUnit,
} from "@servis-track/shared";

import { validateForm, type FieldErrors } from "@/lib/form";
import { machineOptions } from "@/lib/machines";
import {
  END_TIME_OPTIONS,
  RECURRENCE_PRESETS,
  recurrenceKey,
  recurrenceLabel,
  START_TIME_OPTIONS,
} from "@/lib/calendar";
import type { AppUser, CalendarCategory, CalendarTask, Machine, Servicer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { PropertyList, PropertyRow } from "@/components/ui/property-list";
import { Separator } from "@/components/ui/separator";
import { FlashInput } from "@/components/ui/flash-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DangerZone } from "@/components/dialog-rows";
import { CALENDAR_COLOR_META } from "@/components/calendar/calendar-meta";

const NONE = "NONE";

const TIME_MODE_OPTIONS: ComboboxOption[] = [
  { value: "at", label: "Ob uri", icon: Clock },
  { value: "all", label: "Cel dan", icon: CalendarDays },
];
const DEFAULT_START = 10 * 60;

export type TaskDraft = { date: string; startMinute: number | null; endMinute?: number };

const endAfter = (start: number) => Math.min(start + 60, CALENDAR_DAY_END);

export function TaskDialog({
  open,
  onOpenChange,
  initial,
  draft,
  categories,
  machines,
  servicers,
  users,
  busy,
  onSubmit,
  onRequestDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: CalendarTask | null;
  draft?: TaskDraft | null;
  categories: CalendarCategory[];
  machines: Machine[];
  servicers: Servicer[];
  users: AppUser[];
  busy: boolean;
  onSubmit: (values: Record<string, unknown>) => void;
  onRequestDelete?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState(NONE);
  const [machineId, setMachineId] = useState(NONE);
  const [date, setDate] = useState<string | null>(null);
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState(DEFAULT_START);
  const [end, setEnd] = useState(endAfter(DEFAULT_START));
  const [recurrence, setRecurrence] = useState(NONE);
  const [until, setUntil] = useState<string | null>(null);
  const [servicerId, setServicerId] = useState(NONE);
  const [assigneeId, setAssigneeId] = useState(NONE);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title);
      setCategoryId(initial.categoryId ?? NONE);
      setMachineId(initial.machineId ?? NONE);
      setDate(initial.date);
      setAllDay(initial.startMinute === null);
      setStart(initial.startMinute ?? DEFAULT_START);
      setEnd(initial.endMinute ?? endAfter(initial.startMinute ?? DEFAULT_START));
      setRecurrence(recurrenceKey(initial.recurrenceUnit, initial.recurrenceInterval));
      setUntil(initial.recurrenceUntil);
      setServicerId(initial.servicerId ?? NONE);
      setAssigneeId(initial.assigneeId ?? NONE);
      setNotes(initial.notes ?? "");
    } else {
      setTitle("");
      setCategoryId(NONE);
      setMachineId(NONE);
      setDate(draft?.date ?? null);
      setAllDay(draft !== undefined && draft !== null && draft.startMinute === null);
      const s = Math.min(draft?.startMinute ?? DEFAULT_START, CALENDAR_DAY_END - CALENDAR_STEP);
      setStart(s);
      setEnd(draft?.endMinute !== undefined && draft.endMinute > s ? draft.endMinute : endAfter(s));
      setRecurrence(NONE);
      setUntil(null);
      setServicerId(NONE);
      setAssigneeId(NONE);
      setNotes("");
    }
    setErrors({});
  }, [open, initial, draft]);

  const categoryOptions: ComboboxOption[] = useMemo(
    () => [
      { value: NONE, label: "Brez kategorije" },
      ...categories.map((c) => ({
        value: c.id,
        label: c.name,
        swatchClassName: CALENDAR_COLOR_META[c.color].dot,
      })),
    ],
    [categories],
  );

  const recurrenceOptions: ComboboxOption[] = useMemo(() => {
    const presets = RECURRENCE_PRESETS.map((p) => ({
      value: recurrenceKey(p.unit, p.interval),
      label: recurrenceLabel(p.unit, p.interval),
    }));
    if (initial?.recurrenceUnit) {
      const key = recurrenceKey(initial.recurrenceUnit, initial.recurrenceInterval);
      if (!presets.some((p) => p.value === key)) {
        presets.push({ value: key, label: recurrenceLabel(initial.recurrenceUnit, initial.recurrenceInterval) });
      }
    }
    return presets;
  }, [initial]);

  const servicerOptions: ComboboxOption[] = useMemo(
    () => [
      { value: NONE, label: "Brez serviserja" },
      ...servicers
        .filter((s) => s.active || s.id === initial?.servicerId)
        .map((s) => ({ value: s.id, label: s.name, keywords: s.specialty ?? "" })),
    ],
    [servicers, initial],
  );

  const userOptions: ComboboxOption[] = useMemo(
    () => [
      { value: NONE, label: "Nihče" },
      ...users
        .filter((u) => u.active || u.id === initial?.assigneeId)
        .map((u) => ({
          value: u.id,
          label: u.name ?? u.username,
          keywords: `${u.username} ${u.department?.name ?? ""}`,
          group: u.department?.name ?? "Brez oddelka",
        })),
    ],
    [users, initial],
  );

  const [unit, interval] =
    recurrence === NONE
      ? [null, 1]
      : ([recurrence.split("-")[0] as RecurrenceUnit, Number(recurrence.split("-")[1])] as const);

  function submit() {
    const values = {
      title: title.trim(),
      notes: notes.trim() || null,
      categoryId: categoryId === NONE ? null : categoryId,
      machineId: machineId === NONE ? null : machineId,
      servicerId: servicerId === NONE ? null : servicerId,
      assigneeId: assigneeId === NONE ? null : assigneeId,
      date: date ?? "",
      startMinute: allDay ? null : start,
      endMinute: allDay ? null : end,
      recurrenceUnit: unit,
      recurrenceInterval: interval,
      recurrenceUntil: unit ? until : null,
    };
    const parsed = validateForm(createCalendarTaskSchema, values);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    onSubmit(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[26rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="size-5 shrink-0" />
            {initial ? "Uredi opravilo" : "Novo opravilo"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {initial?.recurrenceUnit
              ? "Sprememba velja za vse ponovitve tega opravila."
              : "Kaj je treba narediti, na katerem sredstvu in kdaj."}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="space-y-1">
            <FlashInput
              aria-label="Naziv"
              placeholder="Naziv opravila"
              value={title}
              aria-invalid={!!errors.title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold"
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>

          <PropertyList>
            <PropertyRow label="Kategorija">
              <Combobox
                variant="inline"
                emptyValue={NONE}
                value={categoryId}
                onChange={setCategoryId}
                options={categoryOptions}
                icon={Shapes}
              />
            </PropertyRow>

            <PropertyRow label="Sredstvo">
              <Combobox
                variant="inline"
                emptyValue={NONE}
                value={machineId}
                onChange={setMachineId}
                options={machineOptions(machines, { value: NONE, label: "Brez sredstva" })}
                icon={LayoutList}
                searchable
                searchPlaceholder="Iskanje po znamki, modelu…"
                listClassName="max-h-60"
              />
            </PropertyRow>

            <PropertyRow label="Serviser">
              <Combobox
                variant="inline"
                emptyValue={NONE}
                value={servicerId}
                onChange={setServicerId}
                options={servicerOptions}
                icon={Wrench}
                searchable
                searchPlaceholder="Iskanje serviserjev…"
              />
            </PropertyRow>

            <PropertyRow label="Odgovorna oseba">
              <Combobox
                variant="inline"
                emptyValue={NONE}
                value={assigneeId}
                onChange={setAssigneeId}
                options={userOptions}
                icon={User}
                searchable
                searchPlaceholder="Iskanje oseb…"
                listClassName="max-h-60"
              />
            </PropertyRow>

            <PropertyRow label="Dan" error={errors.date}>
              <DatePicker
                id="task-date"
                variant="inline"
                value={date}
                onChange={setDate}
                workdaysOnly
                invalid={!!errors.date}
              />
            </PropertyRow>

            <PropertyRow label="Čas" error={errors.startMinute ?? errors.endMinute}>
              <div className="flex min-w-0 flex-wrap items-center gap-x-1">
                <Combobox
                  variant="inline"
                  value={allDay ? "all" : "at"}
                  onChange={(v) => setAllDay(v === "all")}
                  options={TIME_MODE_OPTIONS}
                />
                {!allDay && (
                  <>
                    <Combobox
                      variant="inline"
                      value={String(start)}
                      onChange={(v) => {
                        const s = Number(v);
                        setStart(s);
                        if (end <= s) setEnd(endAfter(s));
                      }}
                      options={START_TIME_OPTIONS}
                      listClassName="max-h-64"
                      className="ml-0 tabular-nums"
                    />
                    <span aria-hidden="true" className="text-muted-foreground">–</span>
                    <Combobox
                      variant="inline"
                      value={String(end)}
                      onChange={(v) => setEnd(Number(v))}
                      options={END_TIME_OPTIONS.filter((o) => Number(o.value) > start)}
                      listClassName="max-h-64"
                      className="ml-0 tabular-nums"
                    />
                  </>
                )}
              </div>
            </PropertyRow>

            <PropertyRow label="Ponavljanje">
              <Combobox
                variant="inline"
                emptyValue={NONE}
                value={recurrence}
                onChange={setRecurrence}
                options={recurrenceOptions}
                icon={Repeat}
              />
            </PropertyRow>

            {unit && (
              <PropertyRow label="Ponavlja se do" error={errors.recurrenceUntil}>
                <DatePicker
                  id="task-until"
                  variant="inline"
                  value={until}
                  onChange={setUntil}
                  clearable
                  clearLabel="Brez konca"
                  placeholder="Brez konca"
                  min={date}
                  invalid={!!errors.recurrenceUntil}
                />
              </PropertyRow>
            )}
          </PropertyList>

          <Separator />
          <div className="space-y-3">
            <Label htmlFor="task-notes" className="font-normal text-muted-foreground">
              Opombe
            </Label>
            <Textarea
              id="task-notes"
              maxLength={CALENDAR_NOTES_MAX}
              placeholder="npr. Naročiti 20 l tekočine pri dobavitelju, koda artikla …"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-24 resize-none"
            />
          </div>

          {initial && onRequestDelete && (
            <DangerZone
              label="Izbriši opravilo"
              description={
                initial.recurrenceUnit
                  ? "Odstrani opravilo in vse njegove ponovitve. Tega ni mogoče razveljaviti."
                  : "Opravilo dokončno odstrani iz plana. Tega ni mogoče razveljaviti."
              }
              actionLabel="Izbriši"
              onAction={onRequestDelete}
            />
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              Prekliči
            </Button>
            <Button type="submit" className="w-full" disabled={busy}>
              {initial ? "Shrani" : "Dodaj opravilo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteTaskDialog({
  task,
  onOpenChange,
  onConfirm,
  busy,
}: {
  task: CalendarTask | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <Dialog open={task !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="size-5 shrink-0" />
            Brisanje opravila
          </DialogTitle>
          <DialogDescription>
            To trajno izbriše <span className="font-semibold text-primary">{task?.title}</span>
            {task?.recurrenceUnit
              ? " in vse njegove ponovitve, skupaj z oznakami, kdo je kaj opravil."
              : " iz plana vzdrževanja."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Prekliči
          </Button>
          <Button variant="destructive" disabled={busy} onClick={onConfirm}>
            Izbriši
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
