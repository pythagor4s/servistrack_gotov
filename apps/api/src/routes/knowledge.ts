import { Router } from "express";
import {
  searchKnowledgeQuerySchema,
  createKnowledgeSchema,
  updateKnowledgeSchema,
  kbSearchQuerySchema,
  kbDiagnoseSchema,
  kbFeedbackSchema,
  idParamSchema,
  type SearchKnowledgeQuery,
  type CreateKnowledgeInput,
  type UpdateKnowledgeInput,
  type KbSearchQuery,
  type KbDiagnoseInput,
  type KbFeedbackInput,
  type IdParam,
} from "@servis-track/shared";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../db";
import { validate } from "../middleware/validate";
import { sendError } from "../middleware/errors";
import type { AuthedUser } from "../middleware/authenticate";
import { departmentOfMachine } from "./tickets";
import {
  bumpViewsInIndex,
  getKnowledgeEngine,
  getResolvedTicketEngine,
  invalidateKnowledgeIndex,
} from "../search/store";
import type { KbEngine, KbHit } from "../search/engine";
import { causeSection, causeSummary } from "../search/sections";

export const knowledgeRouter = Router();

const kbInclude = {
  createdBy: {
    select: { id: true, username: true, name: true, image: { select: { updatedAt: true } } },
  },
  ticket: {
    select: {
      id: true,
      number: true,
      reporterId: true,
      reporterName: true,
      reporter: {
      select: { id: true, username: true, name: true, image: { select: { updatedAt: true } } },
    },
      machine: { select: { id: true, brand: true, model: true } },
    },
  },
  machine: { select: { id: true, brand: true, model: true, serialNo: true } },
  department: { select: { id: true, name: true } },
  category: { select: { id: true, name: true, icon: true } },
} as const;

const kbLinkSelect = {
  id: true,
  title: true,
  type: true,
  createdAt: true,
  ticketId: true,
  category: { select: { id: true, name: true, icon: true } },
  machine: { select: { id: true, brand: true, model: true } },
  ticket: { select: { machine: { select: { id: true, brand: true, model: true } } } },
} as const;

function canManage(user: AuthedUser, createdById: string | null): boolean {
  return user.role === "ADMIN" || (createdById !== null && createdById === user.id);
}

knowledgeRouter.get(
  "/",
  validate({ query: searchKnowledgeQuerySchema }),
  async (_req, res) => {
    const { q, machineId, departmentId, type, limit, offset } = res.locals.valid
      .query as SearchKnowledgeQuery;

    const articles = await prisma.knowledgeArticle.findMany({
      where: {
        published: true,
        ...(departmentId ? { departmentId } : {}),
        ...(type ? { type } : {}),
        AND: [
          ...(machineId ? [{ OR: [{ machineId }, { ticket: { machineId } }] }] : []),
          ...(q
            ? [
                {
                  OR: [
                    { title: { contains: q, mode: "insensitive" as const } },
                    { body: { contains: q, mode: "insensitive" as const } },
                  ],
                },
              ]
            : []),
        ],
      },
      include: kbInclude,
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
    });
    res.status(200).json(articles);
  },
);

async function machineContext(machineId: string | null | undefined) {
  if (!machineId) return null;
  return prisma.machine.findUnique({
    where: { id: machineId },
    select: { id: true, departmentId: true },
  });
}

async function withArticles<T extends { id: string }>(engine: KbEngine, hits: T[]) {
  if (hits.length === 0) return [];
  const rows = await prisma.knowledgeArticle.findMany({
    where: { id: { in: hits.map((h) => h.id) }, published: true },
    include: kbInclude,
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return hits.flatMap((h) => {
    const row = byId.get(h.id);
    if (!row) return [];
    const doc = engine.get(h.id);
    return [
      {
        ...h,
        article: { ...row, helpfulUp: doc?.helpfulUp ?? 0, helpfulDown: doc?.helpfulDown ?? 0 },
      },
    ];
  });
}

knowledgeRouter.get(
  "/search",
  validate({ query: kbSearchQuerySchema }),
  async (req, res) => {
    const input = res.locals.valid.query as KbSearchQuery;
    const started = performance.now();
    const engine = await getKnowledgeEngine();
    const machine = await machineContext(input.boostMachineId);
    const result = engine.search({
      ...input,
      boostMachineId: machine?.id,
      boostDepartmentId: machine?.departmentId ?? undefined,
    });
    const q = input.q?.trim() ?? "";
    const user = res.locals.user as AuthedUser;
    const hits = (await withArticles(engine, result.hits)).map((h) => ({
      ...h,
      cause: q ? causeOf(engine.get(h.id)?.body ?? "") : null,
    }));
    const boost = { boostMachineId: machine?.id, boostDepartmentId: machine?.departmentId ?? undefined };
    const areas = q
      ? likelyAreas(engine, engine.search({ ...input, ...boost, sort: "relevance", limit: 10, offset: 0 }).hits)
      : [];
    const tickets = q && user.role === "ADMIN" ? await similarResolvedTickets(q, boost, input.excludeTicketId) : [];
    const tookMs = Math.round((performance.now() - started) * 10) / 10;
    req.log.debug({ total: result.total, tookMs }, "knowledge search");
    res.status(200).json({
      total: result.total,
      hits,
      facets: result.facets,
      suggestion: result.suggestion,
      areas,
      tickets,
      stats: engine.stats(),
      tookMs,
    });
  },
);

knowledgeRouter.post(
  "/diagnose",
  validate({ body: kbDiagnoseSchema }),
  async (req, res) => {
    const input = res.locals.valid.body as KbDiagnoseInput;
    const user = res.locals.user as AuthedUser;
    const started = performance.now();
    const engine = await getKnowledgeEngine();
    const machine = await machineContext(input.machineId);
    const boost = {
      boostMachineId: machine?.id,
      boostDepartmentId: machine?.departmentId ?? undefined,
    };
    const result = engine.search({
      q: input.description,
      sort: "relevance",
      limit: 8,
      offset: 0,
      excludeTicketId: input.excludeTicketId,
      ...boost,
    });

    const categories = likelyAreas(engine, result.hits);

    const likely = result.hits.filter((h) => h.relevance >= 15).slice(0, 6);
    const causes = (await withArticles(engine, likely)).map((h) => {
      const doc = engine.get(h.id);
      return {
        ...h,
        cause: causeSummary(doc?.body ?? ""),
        sameMachine: !!machine && !!doc?.machineIds.includes(machine.id),
      };
    });

    const tickets =
      user.role === "ADMIN"
        ? await similarResolvedTickets(input.description, boost, input.excludeTicketId)
        : [];

    const tookMs = Math.round((performance.now() - started) * 10) / 10;
    req.log.debug({ causes: causes.length, tickets: tickets.length, tookMs }, "knowledge diagnose");
    res.status(200).json({ categories, causes, tickets, suggestion: result.suggestion, tookMs });
  },
);

function likelyAreas(engine: KbEngine, hits: KbHit[]): { id: string; share: number }[] {
  const byCategory = new Map<string, number>();
  for (const h of hits.filter((x) => x.relevance >= 25)) {
    const categoryId = engine.get(h.id)?.categoryId;
    if (categoryId) byCategory.set(categoryId, (byCategory.get(categoryId) ?? 0) + h.score);
  }
  const total = [...byCategory.values()].reduce((s, v) => s + v, 0) || 1;
  return [...byCategory]
    .map(([id, score]) => ({ id, share: Math.round((100 * score) / total) }))
    .sort((a, b) => b.share - a.share);
}

function causeOf(body: string): string | null {
  const cause = causeSection(body);
  return cause ? causeSummary(body) : null;
}

async function similarResolvedTickets(
  description: string,
  boost: { boostMachineId?: string; boostDepartmentId?: string },
  excludeTicketId?: string,
) {
  const engine = await getResolvedTicketEngine();
  const found = engine.search({
    q: description,
    sort: "relevance",
    limit: 4,
    offset: 0,
    excludeIds: excludeTicketId ? new Set([excludeTicketId]) : undefined,
    ...boost,
  });
  const hits = found.hits.filter((h) => h.relevance >= 30 && h.matchPct >= 25);
  if (hits.length === 0) return [];
  const rows = await prisma.ticket.findMany({
    where: { id: { in: hits.map((h) => h.id) } },
    select: {
      id: true,
      number: true,
      title: true,
      resolution: true,
      resolvedAt: true,
      machine: { select: { id: true, brand: true, model: true } },
    },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return hits.flatMap((h: KbHit) => {
    const t = byId.get(h.id);
    if (!t) return [];
    return [
      {
        id: t.id,
        number: t.number,
        title: t.title,
        resolution: causeSummary(t.resolution ?? ""),
        resolvedAt: t.resolvedAt,
        machine: t.machine,
        relevance: h.relevance,
        matchPct: h.matchPct,
        matched: h.matched,
      },
    ];
  });
}

knowledgeRouter.post(
  "/",
  validate({ body: createKnowledgeSchema }),
  async (_req, res) => {
    const input = res.locals.valid.body as CreateKnowledgeInput;
    const user = res.locals.user as AuthedUser;
    const derived = await departmentOfMachine(input.machineId);
    const article = await prisma.knowledgeArticle.create({
      data: {
        title: input.title,
        body: input.body,
        type: input.type,
        machineId: input.machineId ?? null,
        departmentId: derived !== undefined ? derived : (input.departmentId ?? null),
        categoryId: input.categoryId ?? null,
        tags: input.tags ?? [],
        createdById: user.id,
        published: true,
      },
      include: kbInclude,
    });
    invalidateKnowledgeIndex();
    res.status(201).json(article);
  },
);

knowledgeRouter.get(
  "/:id",
  validate({ params: idParamSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const user = res.locals.user as AuthedUser;
    const article = await prisma.knowledgeArticle.findUnique({ where: { id }, include: kbInclude });
    if (!article || !article.published) {
      return sendError(res, 404, "not_found", "Article not found");
    }

    const engine = await getKnowledgeEngine();
    const doc = engine.get(id);
    const relatedIds = engine.similar(id, 5).map((s) => s.id);
    const machineIds = doc?.machineIds ?? [];
    const sameMachineIds = engine
      .all()
      .filter((d) => d.id !== id && d.machineIds.some((m) => machineIds.includes(m)))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5)
      .map((d) => d.id);

    const [links, votes] = await Promise.all([
      prisma.knowledgeArticle.findMany({
        where: { id: { in: [...relatedIds, ...sameMachineIds] }, published: true },
        select: kbLinkSelect,
      }),
      prisma.knowledgeFeedback.findMany({
        where: { articleId: id },
        select: { userId: true, helpful: true },
      }),
    ]);
    const linkById = new Map(links.map((l) => [l.id, l]));
    const pick = (ids: string[]) => ids.flatMap((x) => (linkById.has(x) ? [linkById.get(x)!] : []));
    const mine = votes.find((v) => v.userId === user.id);

    res.status(200).json({
      ...article,
      helpfulUp: votes.filter((v) => v.helpful).length,
      helpfulDown: votes.filter((v) => !v.helpful).length,
      myFeedback: mine ? mine.helpful : null,
      related: pick(relatedIds),
      sameMachine: pick(sameMachineIds),
    });
  },
);

knowledgeRouter.post(
  "/:id/view",
  validate({ params: idParamSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const updated = await prisma.$executeRaw(
      Prisma.sql`UPDATE "knowledge_articles" SET "views" = "views" + 1 WHERE "id" = ${id} AND "published" = true`,
    );
    if (updated === 0) return sendError(res, 404, "not_found", "Article not found");
    bumpViewsInIndex(id);
    res.status(204).end();
  },
);

knowledgeRouter.put(
  "/:id/feedback",
  validate({ params: idParamSchema, body: kbFeedbackSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const { helpful } = res.locals.valid.body as KbFeedbackInput;
    const user = res.locals.user as AuthedUser;

    const article = await prisma.knowledgeArticle.findUnique({
      where: { id },
      select: { published: true },
    });
    if (!article || !article.published) {
      return sendError(res, 404, "not_found", "Article not found");
    }
    if (helpful === null) {
      await prisma.knowledgeFeedback.deleteMany({ where: { articleId: id, userId: user.id } });
    } else {
      await prisma.knowledgeFeedback.upsert({
        where: { articleId_userId: { articleId: id, userId: user.id } },
        create: { articleId: id, userId: user.id, helpful },
        update: { helpful },
      });
    }
    invalidateKnowledgeIndex();
    const votes = await prisma.knowledgeFeedback.groupBy({
      by: ["helpful"],
      where: { articleId: id },
      _count: { _all: true },
    });
    res.status(200).json({
      helpfulUp: votes.find((v) => v.helpful)?._count._all ?? 0,
      helpfulDown: votes.find((v) => !v.helpful)?._count._all ?? 0,
      myFeedback: helpful,
    });
  },
);

knowledgeRouter.patch(
  "/:id",
  validate({ params: idParamSchema, body: updateKnowledgeSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const input = res.locals.valid.body as UpdateKnowledgeInput;
    const user = res.locals.user as AuthedUser;

    const existing = await prisma.knowledgeArticle.findUnique({ where: { id } });
    if (!existing) return sendError(res, 404, "not_found", "Article not found");
    if (!canManage(user, existing.createdById)) {
      return sendError(res, 403, "forbidden", "Not your knowledge entry");
    }
    const derived = await departmentOfMachine(input.machineId);
    const article = await prisma.knowledgeArticle.update({
      where: { id },
      data: derived !== undefined ? { ...input, departmentId: derived } : input,
      include: kbInclude,
    });
    invalidateKnowledgeIndex();
    res.status(200).json(article);
  },
);

knowledgeRouter.delete(
  "/:id",
  validate({ params: idParamSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const user = res.locals.user as AuthedUser;

    const existing = await prisma.knowledgeArticle.findUnique({ where: { id } });
    if (!existing) return sendError(res, 404, "not_found", "Article not found");
    if (!canManage(user, existing.createdById)) {
      return sendError(res, 403, "forbidden", "Not your knowledge entry");
    }
    await prisma.knowledgeArticle.delete({ where: { id } });
    invalidateKnowledgeIndex();
    res.status(204).end();
  },
);
