import { Router } from "express";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  idParamSchema,
  type CreateDepartmentInput,
  type UpdateDepartmentInput,
  type IdParam,
} from "@servis-track/shared";
import { prisma } from "../db";
import { validate } from "../middleware/validate";
import { sendError } from "../middleware/errors";
import { requireRole } from "../middleware/authenticate";

export const departmentsRouter = Router();

departmentsRouter.get("/", async (_req, res) => {
  const departments = await prisma.department.findMany({
    include: { _count: { select: { machines: true } } },
    orderBy: { name: "asc" },
  });
  res.status(200).json(departments);
});

departmentsRouter.post(
  "/",
  requireRole("ADMIN"),
  validate({ body: createDepartmentSchema }),
  async (_req, res) => {
    const input = res.locals.valid.body as CreateDepartmentInput;
    const department = await prisma.department.create({ data: input });
    res.status(201).json(department);
  },
);

departmentsRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  validate({ params: idParamSchema, body: updateDepartmentSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const input = res.locals.valid.body as UpdateDepartmentInput;
    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) return sendError(res, 404, "not_found", "Department not found");
    const department = await prisma.department.update({ where: { id }, data: input });
    res.status(200).json(department);
  },
);

departmentsRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  validate({ params: idParamSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) return sendError(res, 404, "not_found", "Department not found");
    await prisma.department.delete({ where: { id } });
    res.status(204).end();
  },
);
