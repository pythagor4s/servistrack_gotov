"use client";

import {
  addDays,
  CALENDAR_DAY_END,
  CALENDAR_DAY_START,
  CALENDAR_STEP,
  dayNumber,
  isWorkday,
  OVERDUE_WINDOW_DAYS,
  weekdayIndex,
  type RecurrenceUnit,
} from "@servis-track/shared";

import type { CalendarOccurrence, CalendarTask } from "@/lib/types";

export type CalendarView = "month" | "week" | "day" | "list";
export const CALENDAR_VIEWS: CalendarView[] = ["month", "week", "day", "list"];

export const CALENDAR_VIEW_KEY = "servis-track:calendar-view";

export const SLOT_HEIGHT = 24;
export const SLOT_MINUTES = 30;
export const LIST_DAYS = 31;

const pad = (n: number) => String(n).padStart(2, "0");

export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function nowMinutesLocal(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export const startOfWeek = (date: string) => addDays(date, -weekdayIndex(date));

export const isOffDay = (date: string) => !isWorkday(date);

export const nextWorkday = (date: string) => (isWorkday(date) ? date : addDays(date, 7 - weekdayIndex(date)));

const previousWorkday = (date: string) => (isWorkday(date) ? date : addDays(date, 4 - weekdayIndex(date)));

const firstOfMonth = (date: string) => `${date.slice(0, 8)}01`;

function shiftMonths(date: string, months: number): string {
  const [y, m] = date.split("-").map(Number) as [number, number];
  const total = m - 1 + months;
  const yy = y + Math.floor(total / 12);
  const mm = ((total % 12) + 12) % 12;
  return `${yy}-${pad(mm + 1)}-01`;
}

export function monthGridDays(anchor: string): string[] {
  const start = startOfWeek(firstOfMonth(anchor));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function monthWorkdays(anchor: string): string[] {
  return monthGridDays(anchor).filter(isWorkday);
}

export function weekDays(anchor: string): string[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 5 }, (_, i) => addDays(start, i));
}

export const isSameMonth = (a: string, b: string) => a.slice(0, 7) === b.slice(0, 7);

export function viewRange(view: CalendarView, anchor: string): { from: string; to: string } {
  switch (view) {
    case "month": {
      const days = monthWorkdays(anchor);
      return { from: days[0]!, to: days[days.length - 1]! };
    }
    case "week":
      return { from: startOfWeek(anchor), to: addDays(startOfWeek(anchor), 4) };
    case "day":
      return { from: anchor, to: anchor };
    case "list":
      return { from: anchor, to: addDays(anchor, LIST_DAYS - 1) };
  }
}

export function overdueRange(today: string): { from: string; to: string } {
  return { from: addDays(today, -OVERDUE_WINDOW_DAYS), to: today };
}

export function shiftAnchor(view: CalendarView, anchor: string, dir: 1 | -1): string {
  switch (view) {
    case "month":
      return shiftMonths(anchor, dir);
    case "week":
      return addDays(anchor, 7 * dir);
    case "day":
      return dir === 1 ? nextWorkday(addDays(anchor, 1)) : previousWorkday(addDays(anchor, -1));
    case "list":
      return addDays(anchor, LIST_DAYS * dir);
  }
}

const utc = (date: string) => new Date(dayNumber(date) * 86_400_000);
const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("sl-SI", { timeZone: "UTC", ...opts });

const monthYear = fmt({ month: "long", year: "numeric" });
const monthName = fmt({ month: "long" });
const weekdayShort = fmt({ weekday: "short" });
const weekdayLong = fmt({ weekday: "long" });

export const formatMonthYear = (date: string) => monthYear.format(utc(date));

export const formatWeekdayShort = (date: string) => weekdayShort.format(utc(date));

export function formatDayLong(date: string): string {
  const [y, , d] = date.split("-").map(Number) as [number, number, number];
  return `${d}. ${monthName.format(utc(date))} ${y}`;
}

export const formatDayWithWeekday = (date: string) =>
  `${weekdayLong.format(utc(date))}, ${formatDayLong(date)}`;

export function formatDateOnly(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y}`;
}

export function rangeLabel(view: CalendarView, anchor: string): string {
  switch (view) {
    case "month":
      return formatMonthYear(anchor);
    case "day":
      return formatDayWithWeekday(anchor);
    case "week":
    case "list": {
      const { from, to } = viewRange(view, anchor);
      const [fy, fm, fd] = from.split("-").map(Number) as [number, number, number];
      const [ty, tm, td] = to.split("-").map(Number) as [number, number, number];
      if (fy === ty && fm === tm) return `${fd}.–${td}. ${monthName.format(utc(to))} ${ty}`;
      if (fy === ty) {
        return `${fd}. ${monthName.format(utc(from))} – ${td}. ${monthName.format(utc(to))} ${ty}`;
      }
      return `${formatDayLong(from)} – ${formatDayLong(to)}`;
    }
  }
}

export const formatMinutes = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

export function taskTimeLabel(t: Pick<CalendarTask, "startMinute" | "endMinute">): string {
  return t.startMinute === null || t.endMinute === null
    ? "Cel dan"
    : `${formatMinutes(t.startMinute)}–${formatMinutes(t.endMinute)}`;
}

function timeOptions(from: number, to: number): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (let m = from; m <= to; m += CALENDAR_STEP) {
    out.push({ value: String(m), label: formatMinutes(m) });
  }
  return out;
}
export const START_TIME_OPTIONS = timeOptions(CALENDAR_DAY_START, CALENDAR_DAY_END - CALENDAR_STEP);
export const END_TIME_OPTIONS = timeOptions(CALENDAR_DAY_START + CALENDAR_STEP, CALENDAR_DAY_END);

const UNIT_FORMS: Record<RecurrenceUnit, [string, string, string, string]> = {
  WEEK: ["Vsak teden", "Vsaka {n} tedna", "Vsake {n} tedne", "Vsakih {n} tednov"],
  MONTH: ["Vsak mesec", "Vsaka {n} meseca", "Vsake {n} mesece", "Vsakih {n} mesecev"],
  YEAR: ["Vsako leto", "Vsaki {n} leti", "Vsaka {n} leta", "Vsakih {n} let"],
};

export function recurrenceLabel(unit: RecurrenceUnit | null, interval: number): string {
  if (!unit) return "Ne ponavlja se";
  const r = Math.abs(interval) % 100;
  const form = interval === 1 ? 0 : r === 2 ? 1 : r === 3 || r === 4 ? 2 : 3;
  return UNIT_FORMS[unit][form].replace("{n}", String(interval));
}

export function recurrenceSummary(
  t: Pick<CalendarTask, "recurrenceUnit" | "recurrenceInterval" | "recurrenceUntil" | "date">,
): string {
  const base = recurrenceLabel(t.recurrenceUnit, t.recurrenceInterval);
  if (!t.recurrenceUnit) return base;
  const day = Number(t.date.slice(8, 10));
  const clamp = t.recurrenceUnit !== "WEEK" && day > 28 ? " (v krajših mesecih zadnji dan)" : "";
  return t.recurrenceUntil
    ? `${base}, do ${formatDateOnly(t.recurrenceUntil)}${clamp}`
    : `${base}${clamp}`;
}

export const RECURRENCE_PRESETS: { unit: RecurrenceUnit | null; interval: number }[] = [
  { unit: null, interval: 1 },
  { unit: "WEEK", interval: 1 },
  { unit: "WEEK", interval: 2 },
  { unit: "MONTH", interval: 1 },
  { unit: "MONTH", interval: 3 },
  { unit: "MONTH", interval: 6 },
  { unit: "YEAR", interval: 1 },
];
export const recurrenceKey = (unit: RecurrenceUnit | null, interval: number) =>
  unit ? `${unit}-${interval}` : "NONE";

export function isOverdue(
  occurrence: CalendarOccurrence,
  task: Pick<CalendarTask, "createdAt">,
  today: string,
): boolean {
  if (occurrence.completion || occurrence.date >= today) return false;
  const created = new Date(task.createdAt);
  const createdDay = `${created.getFullYear()}-${pad(created.getMonth() + 1)}-${pad(created.getDate())}`;
  return occurrence.date >= createdDay;
}

export const CALENDAR_CHANGED = "servistrack:calendar-changed";
export function notifyCalendarChanged(): void {
  window.dispatchEvent(new Event(CALENDAR_CHANGED));
}
