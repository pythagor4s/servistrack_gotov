import { Router } from "express";
import multer from "multer";
import {
  createMachineSchema,
  updateMachineSchema,
  idParamSchema,
  MACHINE_IMAGE,
  type CreateMachineInput,
  type UpdateMachineInput,
  type IdParam,
} from "@servis-track/shared";
import { prisma } from "../db";
import { machineStats } from "../machineStats";
import { readImageHeader } from "../images";
import { validate } from "../middleware/validate";
import { sendError } from "../middleware/errors";
import { requireRole, type AuthedUser } from "../middleware/authenticate";

export const machinesRouter = Router();

const machineInclude = {
  department: true,
  type: true,
  attachedTo: { select: { id: true, brand: true, model: true } },
} as const;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MACHINE_IMAGE.maxBytes },
});

machinesRouter.get("/", async (_req, res) => {
  const [machines, openByMachine] = await Promise.all([
    prisma.machine.findMany({
      include: {
        ...machineInclude,
        _count: { select: { tickets: true } },
        image: { select: { updatedAt: true } },
      },
      orderBy: [{ brand: "asc" }, { model: "asc" }],
    }),
    prisma.ticket.groupBy({
      by: ["machineId"],
      where: { machineId: { not: null }, status: { not: "RESOLVED" } },
      _count: true,
    }),
  ]);

  const openCounts = new Map(openByMachine.map((row) => [row.machineId, row._count]));

  res.status(200).json(
    machines.map(({ image, ...machine }) => ({
      ...machine,
      hasImage: image !== null,
      imageUpdatedAt: image?.updatedAt ?? null,
      openTicketCount: openCounts.get(machine.id) ?? 0,
    })),
  );
});

machinesRouter.get("/:id/image", validate({ params: idParamSchema }), async (_req, res) => {
  const { id } = res.locals.valid.params as IdParam;
  const image = await prisma.machineImage.findUnique({ where: { machineId: id } });
  if (!image) return sendError(res, 404, "not_found", "Machine has no image");

  res.setHeader("Content-Type", image.mimeType);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
  res.setHeader("ETag", `"${id}-${image.updatedAt.getTime()}"`);
  res.send(Buffer.from(image.data));
});

machinesRouter.post(
  "/:id/image",
  requireRole("ADMIN"),
  validate({ params: idParamSchema }),
  upload.single("file"),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const file = _req.file;
    if (!file) return sendError(res, 400, "validation_error", "No file uploaded (field 'file')");

    if (!(MACHINE_IMAGE.mimeTypes as readonly string[]).includes(file.mimetype)) {
      return sendError(res, 400, "validation_error", "Only PNG and WebP images are allowed");
    }

    const header = readImageHeader(file.buffer);
    if (!header || `image/${header.format}` !== file.mimetype) {
      return sendError(res, 400, "validation_error", "File is not a valid PNG or WebP image");
    }

    if (header.width !== MACHINE_IMAGE.width || header.height !== MACHINE_IMAGE.height) {
      return sendError(
        res,
        400,
        "validation_error",
        `Image must be exactly ${MACHINE_IMAGE.width}x${MACHINE_IMAGE.height} pixels (got ${header.width}x${header.height})`,
      );
    }

    const machine = await prisma.machine.findUnique({ where: { id } });
    if (!machine) return sendError(res, 404, "not_found", "Machine not found");

    const fields = {
      mimeType: file.mimetype,
      size: file.size,
      width: header.width,
      height: header.height,
      data: new Uint8Array(file.buffer),
    };
    const image = await prisma.machineImage.upsert({
      where: { machineId: id },
      create: { machineId: id, ...fields },
      update: fields,
      select: { id: true, mimeType: true, size: true, width: true, height: true, updatedAt: true },
    });
    res.status(201).json(image);
  },
);

machinesRouter.delete(
  "/:id/image",
  requireRole("ADMIN"),
  validate({ params: idParamSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const existing = await prisma.machineImage.findUnique({ where: { machineId: id } });
    if (!existing) return sendError(res, 404, "not_found", "Machine has no image");
    await prisma.machineImage.delete({ where: { machineId: id } });
    res.status(204).end();
  },
);

machinesRouter.get("/:id", validate({ params: idParamSchema }), async (_req, res) => {
  const { id } = res.locals.valid.params as IdParam;
  const machine = await prisma.machine.findUnique({
    where: { id },
    include: {
      ...machineInclude,
      image: { select: { updatedAt: true } },
      tickets: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          resolution: true,
          createdAt: true,
          faultDate: true,
          resolvedAt: true,
          machineDown: true,
          serviceCostCents: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!machine) return sendError(res, 404, "not_found", "Machine not found");
  const stats = machineStats(machine.tickets);
  const user = res.locals.user as AuthedUser;
  if (user.role !== "ADMIN") {
    res.status(200).json({
      ...machine,
      tickets: machine.tickets.map(({ serviceCostCents: _cost, ...t }) => t),
      stats: { ...stats, costCents: null },
    });
    return;
  }
  res.status(200).json({ ...machine, stats });
});

machinesRouter.post(
  "/",
  requireRole("ADMIN"),
  validate({ body: createMachineSchema }),
  async (_req, res) => {
    const input = res.locals.valid.body as CreateMachineInput;
    const machine = await prisma.machine.create({ data: input, include: machineInclude });
    res.status(201).json(machine);
  },
);

machinesRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  validate({ params: idParamSchema, body: updateMachineSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const input = res.locals.valid.body as UpdateMachineInput;
    const existing = await prisma.machine.findUnique({ where: { id } });
    if (!existing) return sendError(res, 404, "not_found", "Machine not found");
    const machine = await prisma.machine.update({
      where: { id },
      data: input,
      include: machineInclude,
    });
    res.status(200).json(machine);
  },
);

machinesRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  validate({ params: idParamSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const existing = await prisma.machine.findUnique({ where: { id } });
    if (!existing) return sendError(res, 404, "not_found", "Machine not found");
    await prisma.machine.delete({ where: { id } });
    res.status(204).end();
  },
);
