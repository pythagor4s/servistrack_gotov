import { prisma } from "../db";
import { logger } from "../logger";
import { KbEngine, type KbDoc } from "./engine";

const STAMP_EVERY_MS = 30_000;
const MAX_AGE_MS = 10 * 60_000;
const TICKETS_MAX_AGE_MS = 60_000;

interface Cached {
  engine: KbEngine;
  stamp: string;
  builtAt: number;
  checkedAt: number;
}

let cached: Cached | null = null;
let dirty = false;
let building: Promise<KbEngine> | null = null;

let ticketsCached: { engine: KbEngine; builtAt: number } | null = null;

export function invalidateKnowledgeIndex(): void {
  dirty = true;
  ticketsCached = null;
}

export function bumpViewsInIndex(id: string): void {
  cached?.engine.bumpViews(id);
}

export async function getKnowledgeEngine(): Promise<KbEngine> {
  const now = Date.now();
  if (cached && !dirty && now - cached.builtAt < MAX_AGE_MS) {
    if (now - cached.checkedAt < STAMP_EVERY_MS) return cached.engine;
    const stamp = await readStamp();
    if (stamp === cached.stamp) {
      cached.checkedAt = now;
      return cached.engine;
    }
  }
  return rebuild();
}

function rebuild(): Promise<KbEngine> {
  if (building) return building;
  dirty = false;
  building = (async () => {
    const started = performance.now();
    const [stamp, docs] = await Promise.all([readStamp(), loadKnowledgeDocs()]);
    const engine = new KbEngine(docs);
    const now = Date.now();
    cached = { engine, stamp, builtAt: now, checkedAt: now };
    logger.debug(
      { docs: docs.length, ms: Math.round(performance.now() - started) },
      "knowledge index built",
    );
    return engine;
  })().finally(() => {
    building = null;
  });
  return building;
}

async function readStamp(): Promise<string> {
  const [articles, categories, feedback, machines] = await Promise.all([
    prisma.knowledgeArticle.aggregate({
      where: { published: true },
      _count: { _all: true },
      _max: { updatedAt: true },
    }),
    prisma.faultCategory.aggregate({ _count: { _all: true }, _max: { updatedAt: true } }),
    prisma.knowledgeFeedback.aggregate({ _count: { _all: true }, _max: { updatedAt: true } }),
    prisma.machine.aggregate({ _max: { updatedAt: true } }),
  ]);
  return [
    articles._count._all,
    articles._max.updatedAt?.getTime(),
    categories._count._all,
    categories._max.updatedAt?.getTime(),
    feedback._count._all,
    feedback._max.updatedAt?.getTime(),
    machines._max.updatedAt?.getTime(),
  ].join("|");
}

const machineLabel = (m: { brand: string; model: string } | null | undefined) =>
  m ? `${m.brand} ${m.model}` : null;

export async function loadKnowledgeDocs(): Promise<KbDoc[]> {
  const rows = await prisma.knowledgeArticle.findMany({
    where: { published: true },
    select: {
      id: true,
      title: true,
      body: true,
      tags: true,
      type: true,
      categoryId: true,
      departmentId: true,
      machineId: true,
      ticketId: true,
      pinned: true,
      views: true,
      createdAt: true,
      category: { select: { name: true } },
      department: { select: { name: true } },
      machine: { select: { brand: true, model: true } },
      ticket: { select: { machineId: true, machine: { select: { brand: true, model: true } } } },
      feedback: { select: { helpful: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    tags: r.tags,
    type: r.type,
    categoryId: r.categoryId,
    categoryName: r.category?.name ?? null,
    departmentId: r.departmentId,
    departmentName: r.department?.name ?? null,
    machineIds: [...new Set([r.machineId, r.ticket?.machineId].filter((x): x is string => !!x))],
    machineLabel: machineLabel(r.machine) ?? machineLabel(r.ticket?.machine),
    ticketId: r.ticketId,
    pinned: r.pinned,
    views: r.views,
    helpfulUp: r.feedback.filter((f) => f.helpful).length,
    helpfulDown: r.feedback.filter((f) => !f.helpful).length,
    createdAt: r.createdAt.getTime(),
  }));
}

export async function getResolvedTicketEngine(): Promise<KbEngine> {
  if (ticketsCached && Date.now() - ticketsCached.builtAt < TICKETS_MAX_AGE_MS) {
    return ticketsCached.engine;
  }
  const rows = await prisma.ticket.findMany({
    where: {
      status: "RESOLVED",
      resolution: { not: null },
      knowledgeArticles: { none: { published: true } },
    },
    select: {
      id: true,
      title: true,
      resolution: true,
      type: true,
      departmentId: true,
      machineId: true,
      resolvedAt: true,
      createdAt: true,
      department: { select: { name: true } },
      machine: { select: { brand: true, model: true } },
    },
  });
  const engine = new KbEngine(
    rows.map((t) => ({
      id: t.id,
      title: t.title,
      body: t.resolution ?? "",
      tags: [],
      type: t.type,
      categoryId: null,
      categoryName: null,
      departmentId: t.departmentId,
      departmentName: t.department?.name ?? null,
      machineIds: t.machineId ? [t.machineId] : [],
      machineLabel: machineLabel(t.machine),
      ticketId: t.id,
      pinned: false,
      views: 0,
      helpfulUp: 0,
      helpfulDown: 0,
      createdAt: (t.resolvedAt ?? t.createdAt).getTime(),
    })),
  );
  ticketsCached = { engine, builtAt: Date.now() };
  return engine;
}
