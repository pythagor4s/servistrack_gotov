import { Router, type Response } from "express";
import {
  calendarRangeQuerySchema,
  calendarTaskIssues,
  completionParamsSchema,
  createCalendarCategorySchema,
  createCalendarTaskSchema,
  createCompletionSchema,
  expandOccurrences,
  idParamSchema,
  isOccurrence,
  updateCalendarCategorySchema,
  updateCalendarTaskSchema,
  type CalendarRangeQuery,
  type CompletionParams,
  type CreateCalendarCategoryInput,
  type CreateCalendarTaskInput,
  type CreateCompletionInput,
  type ErrorBody,
  type IdParam,
  type UpdateCalendarCategoryInput,
  type UpdateCalendarTaskInput,
} from "@servis-track/shared";
import { prisma } from "../db";
import { validate } from "../middleware/validate";
import { sendError } from "../middleware/errors";
import type { AuthedUser } from "../middleware/authenticate";

export const calendarRouter = Router();

const fromDateOnly = (date: string) => new Date(`${date}T00:00:00.000Z`);
const toDateOnly = (date: Date) => date.toISOString().slice(0, 10);

const personSelect = {
  select: {
    id: true,
    username: true,
    name: true,
    image: { select: { updatedAt: true } },
  },
} as const;

const taskInclude = {
  category: { select: { id: true, name: true, color: true } },
  machine: { select: { id: true, brand: true, model: true, serialNo: true } },
  servicer: { select: { id: true, name: true } },
  assignee: personSelect,
  createdBy: personSelect,
} as const;

function serializeTask<T extends { date: Date; recurrenceUntil: Date | null }>(task: T) {
  return {
    ...task,
    date: toDateOnly(task.date),
    recurrenceUntil: task.recurrenceUntil ? toDateOnly(task.recurrenceUntil) : null,
  };
}

function sendIssues(res: Response, issues: { path: string; message: string }[]) {
  res.locals.outcome = "validation_error";
  const body: ErrorBody = {
    error: {
      code: "validation_error",
      message: "Request validation failed",
      details: issues.map((i) => ({ path: `body.${i.path}`, message: i.message })),
    },
  };
  res.status(400).json(body);
}

calendarRouter.get(
  "/tasks",
  validate({ query: calendarRangeQuerySchema }),
  async (_req, res) => {
    const { from, to } = res.locals.valid.query as CalendarRangeQuery;
    const fromDate = fromDateOnly(from);
    const toDate = fromDateOnly(to);

    const rows = await prisma.calendarTask.findMany({
      where: {
        date: { lte: toDate },
        OR: [
          { recurrenceUnit: null, date: { gte: fromDate } },
          {
            recurrenceUnit: { not: null },
            OR: [{ recurrenceUntil: null }, { recurrenceUntil: { gte: fromDate } }],
          },
        ],
      },
      include: taskInclude,
      orderBy: [{ date: "asc" }, { startMinute: "asc" }],
    });
    const tasks = rows.map(serializeTask);

    const completions = await prisma.calendarCompletion.findMany({
      where: {
        taskId: { in: tasks.map((t) => t.id) },
        occurrenceDate: { gte: fromDate, lte: toDate },
      },
      select: {
        id: true,
        taskId: true,
        occurrenceDate: true,
        completedAt: true,
        completedBy: { select: { id: true, username: true, name: true } },
      },
    });
    const byKey = new Map(
      completions.map((c) => [
        `${c.taskId}|${toDateOnly(c.occurrenceDate)}`,
        { id: c.id, completedAt: c.completedAt, completedBy: c.completedBy },
      ]),
    );

    const occurrences = tasks
      .flatMap((t) =>
        expandOccurrences(t, from, to).map((date) => ({
          taskId: t.id,
          date,
          sort: t.startMinute ?? -1,
          completion: byKey.get(`${t.id}|${date}`) ?? null,
        })),
      )
      .sort((a, b) => a.date.localeCompare(b.date) || a.sort - b.sort)
      .map(({ sort: _sort, ...o }) => o);

    res.status(200).json({ tasks, occurrences });
  },
);

calendarRouter.post(
  "/tasks",
  validate({ body: createCalendarTaskSchema }),
  async (_req, res) => {
    const input = res.locals.valid.body as CreateCalendarTaskInput;
    const user = res.locals.user as AuthedUser;
    const task = await prisma.calendarTask.create({
      data: {
        title: input.title,
        notes: input.notes || null,
        categoryId: input.categoryId ?? null,
        machineId: input.machineId ?? null,
        servicerId: input.servicerId ?? null,
        assigneeId: input.assigneeId ?? null,
        date: fromDateOnly(input.date),
        startMinute: input.startMinute ?? null,
        endMinute: input.endMinute ?? null,
        recurrenceUnit: input.recurrenceUnit ?? null,
        recurrenceInterval: input.recurrenceUnit ? (input.recurrenceInterval ?? 1) : 1,
        recurrenceUntil:
          input.recurrenceUnit && input.recurrenceUntil ? fromDateOnly(input.recurrenceUntil) : null,
        createdById: user.id,
      },
      include: taskInclude,
    });
    res.status(201).json(serializeTask(task));
  },
);

calendarRouter.patch(
  "/tasks/:id",
  validate({ params: idParamSchema, body: updateCalendarTaskSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const input = res.locals.valid.body as UpdateCalendarTaskInput;

    const existing = await prisma.calendarTask.findUnique({ where: { id } });
    if (!existing) return sendError(res, 404, "not_found", "Calendar task not found");

    const pick = <K extends keyof UpdateCalendarTaskInput>(key: K, fallback: unknown) =>
      key in input ? input[key] : fallback;
    const unit = pick("recurrenceUnit", existing.recurrenceUnit) as CreateCalendarTaskInput["recurrenceUnit"];
    const merged = {
      date: (input.date ?? toDateOnly(existing.date)) as string,
      startMinute: pick("startMinute", existing.startMinute) as number | null,
      endMinute: pick("endMinute", existing.endMinute) as number | null,
      recurrenceUnit: unit ?? null,
      recurrenceInterval: unit ? ((pick("recurrenceInterval", existing.recurrenceInterval) as number) ?? 1) : 1,
      recurrenceUntil: unit
        ? ((pick(
            "recurrenceUntil",
            existing.recurrenceUntil ? toDateOnly(existing.recurrenceUntil) : null,
          ) as string | null) ?? null)
        : null,
    };
    const issues = calendarTaskIssues(merged);
    if (issues.length > 0) return sendIssues(res, issues);

    const task = await prisma.calendarTask.update({
      where: { id },
      data: {
        ...("title" in input ? { title: input.title } : {}),
        ...("notes" in input ? { notes: input.notes || null } : {}),
        ...("categoryId" in input ? { categoryId: input.categoryId ?? null } : {}),
        ...("machineId" in input ? { machineId: input.machineId ?? null } : {}),
        ...("servicerId" in input ? { servicerId: input.servicerId ?? null } : {}),
        ...("assigneeId" in input ? { assigneeId: input.assigneeId ?? null } : {}),
        date: fromDateOnly(merged.date),
        startMinute: merged.startMinute ?? null,
        endMinute: merged.endMinute ?? null,
        recurrenceUnit: merged.recurrenceUnit,
        recurrenceInterval: merged.recurrenceInterval,
        recurrenceUntil: merged.recurrenceUntil ? fromDateOnly(merged.recurrenceUntil) : null,
      },
      include: taskInclude,
    });
    res.status(200).json(serializeTask(task));
  },
);

calendarRouter.delete(
  "/tasks/:id",
  validate({ params: idParamSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const existing = await prisma.calendarTask.findUnique({ where: { id } });
    if (!existing) return sendError(res, 404, "not_found", "Calendar task not found");
    await prisma.calendarTask.delete({ where: { id } });
    res.status(204).end();
  },
);

calendarRouter.post(
  "/tasks/:id/completions",
  validate({ params: idParamSchema, body: createCompletionSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const { date } = res.locals.valid.body as CreateCompletionInput;
    const user = res.locals.user as AuthedUser;

    const existing = await prisma.calendarTask.findUnique({ where: { id } });
    if (!existing) return sendError(res, 404, "not_found", "Calendar task not found");
    const rule = serializeTask(existing);
    if (!isOccurrence(rule, date)) {
      return sendIssues(res, [{ path: "date", message: "date is not an occurrence of this task" }]);
    }

    const completion = await prisma.calendarCompletion.create({
      data: { taskId: id, occurrenceDate: fromDateOnly(date), completedById: user.id },
      select: {
        id: true,
        completedAt: true,
        completedBy: { select: { id: true, username: true, name: true } },
      },
    });
    res.status(201).json({ taskId: id, date, completion });
  },
);

calendarRouter.delete(
  "/tasks/:id/completions/:date",
  validate({ params: completionParamsSchema }),
  async (_req, res) => {
    const { id, date } = res.locals.valid.params as CompletionParams;
    const key = { taskId: id, occurrenceDate: fromDateOnly(date) };
    const existing = await prisma.calendarCompletion.findUnique({
      where: { taskId_occurrenceDate: key },
    });
    if (!existing) return sendError(res, 404, "not_found", "Completion not found");
    await prisma.calendarCompletion.delete({ where: { taskId_occurrenceDate: key } });
    res.status(204).end();
  },
);

calendarRouter.get("/categories", async (_req, res) => {
  const categories = await prisma.calendarCategory.findMany({
    include: { _count: { select: { tasks: true } } },
    orderBy: { name: "asc" },
  });
  res.status(200).json(categories);
});

calendarRouter.post(
  "/categories",
  validate({ body: createCalendarCategorySchema }),
  async (_req, res) => {
    const input = res.locals.valid.body as CreateCalendarCategoryInput;
    const category = await prisma.calendarCategory.create({ data: input });
    res.status(201).json(category);
  },
);

calendarRouter.patch(
  "/categories/:id",
  validate({ params: idParamSchema, body: updateCalendarCategorySchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const input = res.locals.valid.body as UpdateCalendarCategoryInput;
    const existing = await prisma.calendarCategory.findUnique({ where: { id } });
    if (!existing) return sendError(res, 404, "not_found", "Calendar category not found");
    const category = await prisma.calendarCategory.update({ where: { id }, data: input });
    res.status(200).json(category);
  },
);

calendarRouter.delete(
  "/categories/:id",
  validate({ params: idParamSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const existing = await prisma.calendarCategory.findUnique({ where: { id } });
    if (!existing) return sendError(res, 404, "not_found", "Calendar category not found");
    await prisma.calendarCategory.delete({ where: { id } });
    res.status(204).end();
  },
);
