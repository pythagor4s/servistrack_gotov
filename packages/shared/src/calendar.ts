import { z } from "zod";

export const CALENDAR_DAY_START = 6 * 60;
export const CALENDAR_DAY_END = 17 * 60;
export const CALENDAR_STEP = 15;
export const CALENDAR_RANGE_MAX_DAYS = 92;
export const OVERDUE_WINDOW_DAYS = 30;
export const CALENDAR_TITLE_MAX = 120;
export const CALENDAR_NOTES_MAX = 2000;
export const CALENDAR_CATEGORY_NAME_MAX = 60;
export const RECURRENCE_INTERVAL_MAX = 12;

export const calendarColorSchema = z.enum(["BLUE", "GREEN", "ORANGE", "RED", "VIOLET", "GRAY"]);
export type CalendarColor = z.infer<typeof calendarColorSchema>;

export const recurrenceUnitSchema = z.enum(["WEEK", "MONTH", "YEAR"]);
export type RecurrenceUnit = z.infer<typeof recurrenceUnitSchema>;

const DAY_MS = 86_400_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const pad = (n: number) => String(n).padStart(2, "0");

export function isDateOnly(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

export function dayNumber(date: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

export function fromDayNumber(n: number): string {
  const t = new Date(n * DAY_MS);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function addDays(date: string, days: number): string {
  return fromDayNumber(dayNumber(date) + days);
}

export function isWorkday(date: string): boolean {
  return weekdayIndex(date) < 5;
}

export function weekdayIndex(date: string): number {
  return (new Date(dayNumber(date) * DAY_MS).getUTCDay() + 6) % 7;
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export type RecurrenceRule = {
  date: string;
  recurrenceUnit: RecurrenceUnit | null;
  recurrenceInterval: number;
  recurrenceUntil: string | null;
};

export function expandOccurrences(rule: RecurrenceRule, from: string, to: string): string[] {
  const start = dayNumber(rule.date);
  const lo = Math.max(dayNumber(from), start);
  const hi = Math.min(
    dayNumber(to),
    rule.recurrenceUntil ? dayNumber(rule.recurrenceUntil) : Number.POSITIVE_INFINITY,
  );
  if (lo > hi) return [];

  const interval = Math.max(1, rule.recurrenceInterval);

  if (rule.recurrenceUnit === null) return lo === start ? [rule.date] : [];

  if (rule.recurrenceUnit === "WEEK") {
    const step = 7 * interval;
    const out: string[] = [];
    for (let d = start + Math.ceil((lo - start) / step) * step; d <= hi; d += step) {
      out.push(fromDayNumber(d));
    }
    return out;
  }

  const monthStep = rule.recurrenceUnit === "MONTH" ? interval : 12 * interval;
  const [y, m, d] = rule.date.split("-").map(Number) as [number, number, number];
  const loDate = fromDayNumber(lo);
  const [ly, lm] = loDate.split("-").map(Number) as [number, number];
  const monthsToLo = (ly - y) * 12 + (lm - m);
  let k = Math.max(0, Math.floor(monthsToLo / monthStep) - 1);
  const out: string[] = [];
  for (;;) {
    const total = m - 1 + k * monthStep;
    const yy = y + Math.floor(total / 12);
    const mi = total % 12;
    const n = Date.UTC(yy, mi, Math.min(d, daysInMonth(yy, mi))) / DAY_MS;
    if (n > hi) break;
    if (n >= lo) out.push(fromDayNumber(n));
    k++;
  }
  return out;
}

export function isOccurrence(rule: RecurrenceRule, date: string): boolean {
  return expandOccurrences(rule, date, date).length === 1;
}

export const dateOnlySchema = z
  .string()
  .refine(isDateOnly, "must be a real calendar date (YYYY-MM-DD)");

const minuteSchema = z
  .number()
  .int()
  .min(CALENDAR_DAY_START)
  .max(CALENDAR_DAY_END)
  .refine((v) => v % CALENDAR_STEP === 0, `must be a multiple of ${CALENDAR_STEP} minutes`);

const optionalId = z.string().min(1).nullable().optional();

export type CalendarTaskShape = {
  date: string;
  startMinute?: number | null;
  endMinute?: number | null;
  recurrenceUnit?: RecurrenceUnit | null;
  recurrenceUntil?: string | null;
};

export function calendarTaskIssues(t: CalendarTaskShape): { path: string; message: string }[] {
  const issues: { path: string; message: string }[] = [];
  if (isDateOnly(t.date) && !isWorkday(t.date)) {
    issues.push({ path: "date", message: "date must be a working day (Monday to Friday)" });
  }
  const hasStart = t.startMinute !== null && t.startMinute !== undefined;
  const hasEnd = t.endMinute !== null && t.endMinute !== undefined;
  if (hasStart !== hasEnd) {
    issues.push({
      path: hasStart ? "endMinute" : "startMinute",
      message: "startMinute and endMinute go together (both, or neither for an all-day task)",
    });
  } else if (hasStart && hasEnd && t.endMinute! <= t.startMinute!) {
    issues.push({ path: "endMinute", message: "endMinute must be after startMinute" });
  }
  if (t.recurrenceUntil) {
    if (!t.recurrenceUnit) {
      issues.push({ path: "recurrenceUntil", message: "recurrenceUntil needs a recurrenceUnit" });
    } else if (dayNumber(t.recurrenceUntil) < dayNumber(t.date)) {
      issues.push({ path: "recurrenceUntil", message: "recurrenceUntil must not be before date" });
    }
  }
  return issues;
}

const taskFields = {
  title: z.string().trim().min(1, "title is required").max(CALENDAR_TITLE_MAX),
  notes: z.string().trim().max(CALENDAR_NOTES_MAX).nullable().optional(),
  categoryId: optionalId,
  machineId: optionalId,
  servicerId: optionalId,
  assigneeId: optionalId,
  date: dateOnlySchema,
  startMinute: minuteSchema.nullable().optional(),
  endMinute: minuteSchema.nullable().optional(),
  recurrenceUnit: recurrenceUnitSchema.nullable().optional(),
  recurrenceInterval: z.number().int().min(1).max(RECURRENCE_INTERVAL_MAX).optional(),
  recurrenceUntil: dateOnlySchema.nullable().optional(),
};

export const createCalendarTaskSchema = z.strictObject(taskFields).superRefine((t, ctx) => {
  for (const issue of calendarTaskIssues(t)) {
    ctx.addIssue({ code: "custom", path: [issue.path], message: issue.message });
  }
});
export type CreateCalendarTaskInput = z.infer<typeof createCalendarTaskSchema>;

export const updateCalendarTaskSchema = z
  .strictObject({
    ...taskFields,
    title: taskFields.title.optional(),
    date: dateOnlySchema.optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "at least one field must be provided",
  });
export type UpdateCalendarTaskInput = z.infer<typeof updateCalendarTaskSchema>;

export const calendarRangeQuerySchema = z
  .object({ from: dateOnlySchema, to: dateOnlySchema })
  .superRefine((q, ctx) => {
    if (!isDateOnly(q.from) || !isDateOnly(q.to)) return;
    const span = dayNumber(q.to) - dayNumber(q.from);
    if (span < 0) {
      ctx.addIssue({ code: "custom", path: ["to"], message: "to must not be before from" });
    } else if (span + 1 > CALENDAR_RANGE_MAX_DAYS) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: `range must not exceed ${CALENDAR_RANGE_MAX_DAYS} days`,
      });
    }
  });
export type CalendarRangeQuery = z.infer<typeof calendarRangeQuerySchema>;

export const createCompletionSchema = z.strictObject({ date: dateOnlySchema });
export type CreateCompletionInput = z.infer<typeof createCompletionSchema>;

export const completionParamsSchema = z.object({
  id: z.string().min(1),
  date: dateOnlySchema,
});
export type CompletionParams = z.infer<typeof completionParamsSchema>;

export const createCalendarCategorySchema = z.strictObject({
  name: z.string().trim().min(1, "name is required").max(CALENDAR_CATEGORY_NAME_MAX),
  color: calendarColorSchema.optional(),
});
export type CreateCalendarCategoryInput = z.infer<typeof createCalendarCategorySchema>;

export const updateCalendarCategorySchema = z
  .strictObject({
    name: z.string().trim().min(1).max(CALENDAR_CATEGORY_NAME_MAX).optional(),
    color: calendarColorSchema.optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "at least one field must be provided",
  });
export type UpdateCalendarCategoryInput = z.infer<typeof updateCalendarCategorySchema>;
