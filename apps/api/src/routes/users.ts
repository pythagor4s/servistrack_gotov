import { Router } from "express";
import multer from "multer";
import {
  createUserSchema,
  updateUserSchema,
  idParamSchema,
  USER_IMAGE,
  type CreateUserInput,
  type UpdateUserInput,
  type IdParam,
  type PublicUser,
} from "@servis-track/shared";
import { prisma } from "../db";
import { readImageHeader } from "../images";
import { validate } from "../middleware/validate";
import { sendError } from "../middleware/errors";
import { requireRole } from "../middleware/authenticate";
import { hashPassword } from "../auth/password";

export const usersRouter = Router();

const publicUserSelect = {
  id: true,
  username: true,
  name: true,
  role: true,
  phone: true,
  active: true,
  email: true,
  departmentId: true,
  department: { select: { id: true, name: true, color: true } },
  image: { select: { updatedAt: true } },
} as const;

type SelectedUser = { image: { updatedAt: Date } | null } & Omit<
  PublicUser,
  "hasImage" | "imageUpdatedAt"
>;

function toPublicUser({ image, ...user }: SelectedUser): PublicUser {
  return {
    ...user,
    hasImage: image !== null,
    imageUpdatedAt: image?.updatedAt.toISOString() ?? null,
  };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: USER_IMAGE.maxBytes },
});

usersRouter.get("/", requireRole("ADMIN"), async (_req, res) => {
  const users = await prisma.user.findMany({
    select: publicUserSelect,
    orderBy: [{ name: "asc" }, { username: "asc" }],
  });
  res.status(200).json(users.map(toPublicUser));
});

usersRouter.post(
  "/",
  requireRole("ADMIN"),
  validate({ body: createUserSchema }),
  async (_req, res) => {
    const input = res.locals.valid.body as CreateUserInput;
    const user = await prisma.user.create({
      data: {
        username: input.username,
        name: input.name,
        role: input.role ?? "TECHNICIAN",
        phone: input.phone,
        email: input.email,
        departmentId: input.departmentId,
        passwordHash: await hashPassword(input.password),
      },
      select: publicUserSelect,
    });
    const body: PublicUser = toPublicUser(user);
    res.status(201).json(body);
  },
);

usersRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  validate({ params: idParamSchema, body: updateUserSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const input = res.locals.valid.body as UpdateUserInput;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return sendError(res, 404, "not_found", "User not found");

    const { password, ...rest } = input;
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...rest,
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
      },
      select: publicUserSelect,
    });
    const body: PublicUser = toPublicUser(user);
    res.status(200).json(body);
  },
);

usersRouter.get("/:id/image", validate({ params: idParamSchema }), async (_req, res) => {
  const { id } = res.locals.valid.params as IdParam;
  const image = await prisma.userImage.findUnique({ where: { userId: id } });
  if (!image) return sendError(res, 404, "not_found", "User has no image");

  res.setHeader("Content-Type", image.mimeType);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
  res.setHeader("ETag", `"${id}-${image.updatedAt.getTime()}"`);
  res.send(Buffer.from(image.data));
});

usersRouter.post(
  "/:id/image",
  requireRole("ADMIN"),
  validate({ params: idParamSchema }),
  upload.single("file"),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const file = _req.file;
    if (!file) return sendError(res, 400, "validation_error", "No file uploaded (field 'file')");

    if (!(USER_IMAGE.mimeTypes as readonly string[]).includes(file.mimetype)) {
      return sendError(res, 400, "validation_error", "Only PNG, WebP and JPEG images are allowed");
    }

    const header = readImageHeader(file.buffer);
    if (!header || `image/${header.format}` !== file.mimetype) {
      return sendError(res, 400, "validation_error", "File is not a valid PNG, WebP or JPEG image");
    }

    const { width, height } = header;
    if (
      width < USER_IMAGE.minSize ||
      height < USER_IMAGE.minSize ||
      width > USER_IMAGE.maxSize ||
      height > USER_IMAGE.maxSize
    ) {
      return sendError(
        res,
        400,
        "validation_error",
        `Image must be between ${USER_IMAGE.minSize} and ${USER_IMAGE.maxSize} pixels on each side (got ${width}x${height})`,
      );
    }

    if (Math.abs(width - height) / Math.max(width, height) > USER_IMAGE.aspectTolerance) {
      return sendError(
        res,
        400,
        "validation_error",
        `Image must be square (got ${width}x${height})`,
      );
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return sendError(res, 404, "not_found", "User not found");

    const fields = {
      mimeType: file.mimetype,
      size: file.size,
      width,
      height,
      data: new Uint8Array(file.buffer),
    };
    const image = await prisma.userImage.upsert({
      where: { userId: id },
      create: { userId: id, ...fields },
      update: fields,
      select: {
        id: true,
        mimeType: true,
        size: true,
        width: true,
        height: true,
        updatedAt: true,
      },
    });
    res.status(201).json(image);
  },
);

usersRouter.delete(
  "/:id/image",
  requireRole("ADMIN"),
  validate({ params: idParamSchema }),
  async (_req, res) => {
    const { id } = res.locals.valid.params as IdParam;
    const existing = await prisma.userImage.findUnique({ where: { userId: id } });
    if (!existing) return sendError(res, 404, "not_found", "User has no image");
    await prisma.userImage.delete({ where: { userId: id } });
    res.status(204).end();
  },
);
