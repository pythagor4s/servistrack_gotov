import type { ExternalCodeKind } from "@servis-track/shared";
import { prisma } from "./db";
import { Prisma } from "./generated/prisma/client";

export type ExternalRefs = {
  machineCode?: string;
  departmentCode?: string;
  categoryCode?: string;
  reporterWorkerNo?: string;
};

const REF_KEY: Record<ExternalCodeKind, keyof ExternalRefs> = {
  MACHINE: "machineCode",
  DEPARTMENT: "departmentCode",
  CATEGORY: "categoryCode",
  WORKER: "reporterWorkerNo",
};

const withTargets = {
  machine: { select: { id: true, brand: true, model: true, departmentId: true } },
  department: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
  user: { select: { id: true, name: true, username: true } },
} satisfies Prisma.ExternalCodeInclude;

type CodeRow = Prisma.ExternalCodeGetPayload<{ include: typeof withTargets }>;

async function touch(kind: ExternalCodeKind, code: string, label: string | undefined): Promise<CodeRow> {
  const now = new Date();
  try {
    return await prisma.externalCode.upsert({
      where: { kind_code: { kind, code } },
      create: { kind, code, label, seenCount: 1, lastSeenAt: now },
      update: { seenCount: { increment: 1 }, lastSeenAt: now, ...(label ? { label } : {}) },
      include: withTargets,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return prisma.externalCode.findUniqueOrThrow({
        where: { kind_code: { kind, code } },
        include: withTargets,
      });
    }
    throw err;
  }
}

export type IngestCodeInput = {
  machineCode?: string;
  machineName?: string;
  departmentCode?: string;
  departmentName?: string;
  categoryCode?: string;
  categoryName?: string;
  reporterWorkerNo?: string;
};

export type ResolvedCodes = {
  machineId?: string;
  machineDepartmentId?: string | null;
  departmentId?: string;
  categoryId?: string;
  reporter?: { id: string; name: string };
  refs: ExternalRefs;
  unmapped: { field: keyof ExternalRefs; code: string }[];
};

export async function resolveExternalCodes(input: IngestCodeInput): Promise<ResolvedCodes> {
  const out: ResolvedCodes = { refs: {}, unmapped: [] };
  const wanted: [ExternalCodeKind, string | undefined, string | undefined][] = [
    ["MACHINE", input.machineCode, input.machineName],
    ["DEPARTMENT", input.departmentCode, input.departmentName],
    ["CATEGORY", input.categoryCode, input.categoryName],
    ["WORKER", input.reporterWorkerNo, undefined],
  ];
  for (const [kind, code, label] of wanted) {
    if (!code) continue;
    const field = REF_KEY[kind];
    out.refs[field] = code;
    const row = await touch(kind, code, label);
    if (kind === "MACHINE" && row.machine) {
      out.machineId = row.machine.id;
      out.machineDepartmentId = row.machine.departmentId;
    } else if (kind === "DEPARTMENT" && row.department) {
      out.departmentId = row.department.id;
    } else if (kind === "CATEGORY" && row.category) {
      out.categoryId = row.category.id;
    } else if (kind === "WORKER" && row.user) {
      out.reporter = { id: row.user.id, name: row.user.name ?? row.user.username };
    } else {
      out.unmapped.push({ field, code });
    }
  }
  return out;
}

export async function relinkTickets(kind: ExternalCodeKind, code: string, targetId: string): Promise<number> {
  const byRef = { externalRefs: { path: [REF_KEY[kind]], equals: code } } satisfies Prisma.TicketWhereInput;
  switch (kind) {
    case "MACHINE": {
      const machine = await prisma.machine.findUnique({
        where: { id: targetId },
        select: { departmentId: true },
      });
      if (!machine) return 0;
      const { count } = await prisma.ticket.updateMany({
        where: { ...byRef, machineId: null },
        data: { machineId: targetId, departmentId: machine.departmentId, type: "MACHINE" },
      });
      return count;
    }
    case "DEPARTMENT": {
      const { count } = await prisma.ticket.updateMany({
        where: { ...byRef, departmentId: null, machineId: null },
        data: { departmentId: targetId },
      });
      return count;
    }
    case "CATEGORY": {
      const { count } = await prisma.ticket.updateMany({
        where: { ...byRef, categoryId: null },
        data: { categoryId: targetId },
      });
      return count;
    }
    case "WORKER": {
      const { count } = await prisma.ticket.updateMany({
        where: { ...byRef, reporterId: null },
        data: { reporterId: targetId },
      });
      return count;
    }
  }
}

export async function targetExists(kind: ExternalCodeKind, targetId: string): Promise<boolean> {
  const where = { where: { id: targetId }, select: { id: true } } as const;
  switch (kind) {
    case "MACHINE":
      return (await prisma.machine.findUnique(where)) !== null;
    case "DEPARTMENT":
      return (await prisma.department.findUnique(where)) !== null;
    case "CATEGORY":
      return (await prisma.faultCategory.findUnique(where)) !== null;
    case "WORKER":
      return (await prisma.user.findUnique(where)) !== null;
  }
}

export function targetData(kind: ExternalCodeKind, targetId: string | null) {
  return {
    machineId: kind === "MACHINE" ? targetId : null,
    departmentId: kind === "DEPARTMENT" ? targetId : null,
    categoryId: kind === "CATEGORY" ? targetId : null,
    userId: kind === "WORKER" ? targetId : null,
  };
}

export { withTargets as externalCodeInclude };
