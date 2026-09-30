import { Router } from "express";
import {
  createFaultCategorySchema,
  updateFaultCategorySchema,
  idParamSchema,
  type CreateFaultCategoryInput,
  type UpdateFaultCategoryInput,
  type IdParam,
} from "@servis-track/shared";
import { prisma } from "../db";
import { validate } from "../middleware/validate";
import { sendError } from "../middleware/errors";
import { requireRole } from "../middleware/authenticate";
import { invalidateKnowledgeIndex } from "../search/store";

export const faultCategoriesRouter = Router();

faultCategoriesRouter.get("/", async (_req, res) => {
  const categories = await prisma.faultCategory.findMany({
    include: { _count: { select: { articles: { where: { published: true } } } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  res.status(200).json(categories);
});

faultCategoriesRouter.post(
  "/",
  requireRole("ADMIN"),
  validate({ body: createFaultCategorySchema }),
  async (_req, res) => {
    const input = res.locals.valid.body as CreateFaultCategoryInput;
    const last = await prisma.faultCategory.aggregate({ _max: { sortOrder: true } });
    const category = await prisma.faultCategory.create({
      data: { ...input, sortOrder: input.sortOrder ?? (last._max.sortOrder ?? 0) + 10 },
    });
    invalidateKnowledgeIndex();
    res.status(201).json(category);
  },
);

faultCategoriesRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  validate({ params: idParamSchema, body: updateFaultCategorySchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const input = res.locals.valid.body as UpdateFaultCategoryInput;
    const existing = await prisma.faultCategory.findUnique({ where: { id } });
    if (!existing) return sendError(res, 404, "not_found", "Fault category not found");
    const category = await prisma.faultCategory.update({ where: { id }, data: input });
    invalidateKnowledgeIndex();
    res.status(200).json(category);
  },
);

faultCategoriesRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  validate({ params: idParamSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const existing = await prisma.faultCategory.findUnique({ where: { id } });
    if (!existing) return sendError(res, 404, "not_found", "Fault category not found");
    await prisma.faultCategory.delete({ where: { id } });
    invalidateKnowledgeIndex();
    res.status(204).end();
  },
);
