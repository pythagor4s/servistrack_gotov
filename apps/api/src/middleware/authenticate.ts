import type { RequestHandler } from "express";
import type { Role } from "@servis-track/shared";
import { prisma } from "../db";
import { verifySession } from "../auth/jwt";
import { SESSION_COOKIE } from "../auth/session";
import { hashApiKey } from "../auth/apiKey";
import { sendError } from "./errors";

export type AuthedUser = { id: string; role: Role };

export const requireAuth: RequestHandler = async (req, res, next) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== "string" || token.length === 0) {
    return sendError(res, 401, "unauthorized", "Authentication required");
  }
  try {
    const claims = await verifySession(token);
    const user: AuthedUser = { id: claims.sub, role: claims.role };
    res.locals.user = user;
    next();
  } catch {
    sendError(res, 401, "unauthorized", "Invalid or expired session");
  }
};

export function requireRole(...roles: Role[]): RequestHandler {
  return (_req, res, next) => {
    const user = res.locals.user as AuthedUser | undefined;
    if (!user) {
      return sendError(res, 401, "unauthorized", "Authentication required");
    }
    if (!roles.includes(user.role)) {
      return sendError(res, 403, "forbidden", "Insufficient role");
    }
    next();
  };
}

export const requireApiKey: RequestHandler = async (req, res, next) => {
  const provided = req.header("x-api-key");
  if (!provided) {
    return sendError(res, 401, "unauthorized", "API key required");
  }

  const key = await prisma.apiKey.findUnique({
    where: { hashedKey: hashApiKey(provided) },
  });
  if (!key) {
    req.log.warn("ingest: rejected unknown API key");
    return sendError(res, 401, "unauthorized", "Invalid API key");
  }

  await prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });
  res.locals.apiKeyId = key.id;
  next();
};
