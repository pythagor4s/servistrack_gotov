import { Router } from "express";
import {
  createExternalCodeSchema,
  mapExternalCodeSchema,
  idParamSchema,
  type CreateExternalCodeInput,
  type MapExternalCodeInput,
  type IdParam,
} from "@servis-track/shared";
import { prisma } from "../db";
import { validate } from "../middleware/validate";
import { sendError } from "../middleware/errors";
import {
  externalCodeInclude,
  relinkTickets,
  targetData,
  targetExists,
} from "../externalCodes";

export const externalCodesRouter = Router();

externalCodesRouter.get("/", async (_req, res) => {
  const codes = await prisma.externalCode.findMany({
    include: externalCodeInclude,
    orderBy: [{ kind: "asc" }, { code: "asc" }],
  });
  const mapped = (c: (typeof codes)[number]) =>
    c.machineId !== null || c.departmentId !== null || c.categoryId !== null || c.userId !== null;
  codes.sort((a, b) => Number(mapped(a)) - Number(mapped(b)));
  res.status(200).json(codes);
});

externalCodesRouter.post(
  "/",
  validate({ body: createExternalCodeSchema }),
  async (_req, res) => {
    const input = res.locals.valid.body as CreateExternalCodeInput;
    const targetId = input.targetId ?? null;
    if (targetId && !(await targetExists(input.kind, targetId))) {
      return sendError(res, 400, "bad_reference", "Unknown targetId for this kind");
    }
    const code = await prisma.externalCode.create({
      data: { kind: input.kind, code: input.code, label: input.label, ...targetData(input.kind, targetId) },
      include: externalCodeInclude,
    });
    const relinked = targetId ? await relinkTickets(input.kind, input.code, targetId) : 0;
    res.status(201).json({ code, relinked });
  },
);

externalCodesRouter.patch(
  "/:id",
  validate({ params: idParamSchema, body: mapExternalCodeSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const { targetId } = res.locals.valid.body as MapExternalCodeInput;
    const existing = await prisma.externalCode.findUnique({ where: { id } });
    if (!existing) return sendError(res, 404, "not_found", "External code not found");
    if (targetId && !(await targetExists(existing.kind, targetId))) {
      return sendError(res, 400, "bad_reference", "Unknown targetId for this kind");
    }
    const code = await prisma.externalCode.update({
      where: { id },
      data: targetData(existing.kind, targetId),
      include: externalCodeInclude,
    });
    const relinked = targetId ? await relinkTickets(existing.kind, existing.code, targetId) : 0;
    res.status(200).json({ code, relinked });
  },
);

externalCodesRouter.delete(
  "/:id",
  validate({ params: idParamSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const existing = await prisma.externalCode.findUnique({ where: { id } });
    if (!existing) return sendError(res, 404, "not_found", "External code not found");
    await prisma.externalCode.delete({ where: { id } });
    res.status(204).end();
  },
);
