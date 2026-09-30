import { Router } from "express";
import {
  createMachineTypeSchema,
  updateMachineTypeSchema,
  idParamSchema,
  type CreateMachineTypeInput,
  type UpdateMachineTypeInput,
  type IdParam,
} from "@servis-track/shared";
import { prisma } from "../db";
import { validate } from "../middleware/validate";
import { sendError } from "../middleware/errors";
import { requireRole } from "../middleware/authenticate";

export const machineTypesRouter = Router();

machineTypesRouter.get("/", async (_req, res) => {
  const types = await prisma.machineType.findMany({
    include: { _count: { select: { machines: true } } },
    orderBy: { name: "asc" },
  });
  res.status(200).json(types);
});

machineTypesRouter.post(
  "/",
  requireRole("ADMIN"),
  validate({ body: createMachineTypeSchema }),
  async (_req, res) => {
    const input = res.locals.valid.body as CreateMachineTypeInput;
    const type = await prisma.machineType.create({ data: input });
    res.status(201).json(type);
  },
);

machineTypesRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  validate({ params: idParamSchema, body: updateMachineTypeSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const input = res.locals.valid.body as UpdateMachineTypeInput;
    const existing = await prisma.machineType.findUnique({ where: { id } });
    if (!existing) return sendError(res, 404, "not_found", "Machine type not found");
    const type = await prisma.machineType.update({ where: { id }, data: input });
    res.status(200).json(type);
  },
);

machineTypesRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  validate({ params: idParamSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const existing = await prisma.machineType.findUnique({ where: { id } });
    if (!existing) return sendError(res, 404, "not_found", "Machine type not found");
    await prisma.machineType.delete({ where: { id } });
    res.status(204).end();
  },
);
