import type { ErrorRequestHandler, RequestHandler, Response } from "express";
import { MulterError } from "multer";
import type { ErrorBody, ErrorCode } from "@servis-track/shared";
import { Prisma } from "../generated/prisma/client";

export function sendError(
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
): void {
  res.locals.outcome = code;
  const body: ErrorBody = { error: { code, message } };
  res.status(status).json(body);
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  sendError(res, 404, "not_found", "Resource not found");
};

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (isBodyParseError(err)) {
    return sendError(res, 400, "validation_error", "Malformed JSON body");
  }

  if (err instanceof MulterError) {
    return sendError(res, 400, "validation_error", err.message);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2025": return sendError(res, 404, "not_found", "Resource not found");
      case "P2002": return sendError(res, 409, "conflict", conflictMessage(err.meta));
      case "P2003": return sendError(res, 400, "bad_reference", "A referenced resource does not exist");
    }
  }

  req.log.error({ err }, "unhandled error");
  return sendError(res, 500, "internal_error", "Internal server error");
};

function conflictMessage(meta: unknown): string {
  const fields = conflictFields(meta);

  if (fields.includes("username")) return "Uporabniško ime je že zasedeno.";
  if (fields.includes("email")) return "E-pošta je že v uporabi.";
  if (fields.includes("name")) return "To ime je že v uporabi.";

  return "Zapis s to vrednostjo že obstaja.";
}

function conflictFields(meta: unknown): string[] {
  const asRecord = (v: unknown): Record<string, unknown> =>
    typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};

  const cause = asRecord(asRecord(asRecord(meta).driverAdapterError).cause);
  const fields = asRecord(cause.constraint).fields;
  if (Array.isArray(fields)) return fields.map(String);

  const target = asRecord(meta).target;
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === "string") return [target];

  const named = /unique constraint "[a-z_]*?_([a-z]+)_key"/i.exec(String(cause.originalMessage ?? ""));
  return named ? [named[1] as string] : [];
}

function isBodyParseError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { type?: unknown }).type === "entity.parse.failed"
  );
}
