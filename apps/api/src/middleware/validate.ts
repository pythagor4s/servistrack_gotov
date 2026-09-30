import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import type { ErrorBody, ErrorDetail } from "@servis-track/shared";

type ValidationSchemas = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

export type Validated = {
  body?: unknown;
  params?: unknown;
  query?: unknown;
};

const PARTS = ["body", "params", "query"] as const;

export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, res, next) => {
    const details: ErrorDetail[] = [];
    const valid: Validated = {};

    for (const part of PARTS) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part]);
      if (result.success) {
        valid[part] = result.data;
        continue;
      }
      for (const issue of result.error.issues) {
        const path = [part, ...issue.path.map(String)].filter((seg) => seg.length > 0).join(".");
        details.push({ path, message: issue.message });
      }
    }

    if (details.length > 0) {
      res.locals.outcome = "validation_error";
      const body: ErrorBody = {
        error: { code: "validation_error", message: "Request validation failed", details },
      };
      res.status(400).json(body);
      return;
    }

    res.locals.valid = valid;
    next();
  };
}
