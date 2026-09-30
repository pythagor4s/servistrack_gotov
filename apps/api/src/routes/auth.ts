import { Router } from "express";
import {
  loginSchema,
  updatePreferencesSchema,
  type LoginInput,
  type SessionUser,
  type UpdatePreferencesInput,
  type DepartmentColor,
} from "@servis-track/shared";
import { prisma } from "../db";
import { validate } from "../middleware/validate";
import { loginLimiter } from "../middleware/loginRateLimit";
import { sendError } from "../middleware/errors";
import {
  requireAuth,
  type AuthedUser,
} from "../middleware/authenticate";
import { hashPassword, verifyPassword } from "../auth/password";
import { signSession } from "../auth/jwt";
import { SESSION_COOKIE, sessionCookieOptions } from "../auth/session";

export const authRouter = Router();

const sessionInclude = {
  department: { select: { id: true, name: true, color: true } },
  image: { select: { updatedAt: true } },
} as const;

function toSessionUser(user: {
  id: string;
  username: string;
  name: string | null;
  role: "ADMIN" | "TECHNICIAN";
  phone: string | null;
  active: boolean;
  email: string | null;
  departmentId: string | null;
  department: { id: string; name: string; color: DepartmentColor } | null;
  image: { updatedAt: Date } | null;
  theme: "DARK" | "LIGHT";
  viewTickets: "CARDS" | "TABLE";
  viewMachines: "CARDS" | "TABLE";
  viewServicers: "CARDS" | "TABLE";
  viewUsers: "CARDS" | "TABLE";
  notifyEmail: boolean;
}): SessionUser {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    phone: user.phone,
    active: user.active,
    email: user.email,
    departmentId: user.departmentId,
    department: user.department,
    hasImage: user.image !== null,
    imageUpdatedAt: user.image?.updatedAt.toISOString() ?? null,
    preferences: {
      theme: user.theme,
      viewTickets: user.viewTickets,
      viewMachines: user.viewMachines,
      viewServicers: user.viewServicers,
      viewUsers: user.viewUsers,
      notifyEmail: user.notifyEmail,
    },
  };
}

let dummyHash: Promise<string> | null = null;
function timingDummyHash(): Promise<string> {
  dummyHash ??= hashPassword("no-such-user-timing-equalizer");
  return dummyHash;
}

authRouter.post(
  "/login",
  validate({ body: loginSchema }),
  loginLimiter.middleware,
  async (_req, res) => {
    const { username, password } = res.locals.valid.body as LoginInput;

    const user = await prisma.user.findUnique({ where: { username }, include: sessionInclude });
    if (!user) {
      await verifyPassword(await timingDummyHash(), password);
      loginLimiter.recordFailure(username);
      return sendError(res, 401, "unauthorized", "Invalid credentials");
    }

    const ok = await verifyPassword(user.passwordHash, password);
    if (!ok) {
      loginLimiter.recordFailure(username);
      return sendError(res, 401, "unauthorized", "Invalid credentials");
    }

    if (!user.active) {
      loginLimiter.recordFailure(username);
      return sendError(res, 401, "unauthorized", "Invalid credentials");
    }

    loginLimiter.clearFailures(username);

    const token = await signSession({ sub: user.id, role: user.role });
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions());

    const body: SessionUser = toSessionUser(user);
    res.status(200).json(body);
  },
);

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (_req, res) => {
  const authed = res.locals.user as AuthedUser;
  const user = await prisma.user.findUnique({ where: { id: authed.id }, include: sessionInclude });
  if (!user) {
    return sendError(res, 401, "unauthorized", "Session user no longer exists");
  }
  if (!user.active) {
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
    return sendError(res, 401, "unauthorized", "Account is deactivated");
  }
  const body: SessionUser = toSessionUser(user);
  res.status(200).json(body);
});

authRouter.patch(
  "/me/preferences",
  requireAuth,
  validate({ body: updatePreferencesSchema }),
  async (_req, res) => {
    const authed = res.locals.user as AuthedUser;
    const input = res.locals.valid.body as UpdatePreferencesInput;
    const user = await prisma.user.update({
      where: { id: authed.id },
      data: input,
      select: {
        theme: true,
        viewTickets: true,
        viewMachines: true,
        viewServicers: true,
        viewUsers: true,
        notifyEmail: true,
      },
    });
    res.status(200).json(user);
  },
);
