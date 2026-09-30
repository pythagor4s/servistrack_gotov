import { Router } from "express";
import {
  createServicerSchema,
  updateServicerSchema,
  idParamSchema,
  type CreateServicerInput,
  type UpdateServicerInput,
  type IdParam,
} from "@servis-track/shared";
import { prisma } from "../db";
import { validate } from "../middleware/validate";
import { sendError } from "../middleware/errors";
import { requireRole } from "../middleware/authenticate";

export const servicersRouter = Router();

servicersRouter.get("/", async (_req, res) => {
  const servicers = await prisma.servicer.findMany({
    include: { _count: { select: { tickets: true } } },
    orderBy: { name: "asc" },
  });
  res.status(200).json(servicers);
});

servicersRouter.post(
  "/",
  requireRole("ADMIN"),
  validate({ body: createServicerSchema }),
  async (_req, res) => {
    const input = res.locals.valid.body as CreateServicerInput;
    const servicer = await prisma.servicer.create({ data: input });
    res.status(201).json(servicer);
  },
);

servicersRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  validate({ params: idParamSchema, body: updateServicerSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const input = res.locals.valid.body as UpdateServicerInput;
    const existing = await prisma.servicer.findUnique({ where: { id } });
    if (!existing) return sendError(res, 404, "not_found", "Servicer not found");
    const servicer = await prisma.servicer.update({ where: { id }, data: input });
    res.status(200).json(servicer);
  },
);

servicersRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  validate({ params: idParamSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const existing = await prisma.servicer.findUnique({ where: { id } });
    if (!existing) return sendError(res, 404, "not_found", "Servicer not found");
    await prisma.servicer.delete({ where: { id } });
    res.status(204).end();
  },
);
