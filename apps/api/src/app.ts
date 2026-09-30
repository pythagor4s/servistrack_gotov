import { randomUUID } from "node:crypto";
import express from "express";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import type { Logger } from "pino";
import type { HealthResponse } from "@servis-track/shared";
import { logger } from "./logger";
import { ticketsRouter } from "./routes/tickets";
import { knowledgeRouter } from "./routes/knowledge";
import { authRouter } from "./routes/auth";
import { ingestRouter } from "./routes/ingest";
import { servicersRouter } from "./routes/servicers";
import { machinesRouter } from "./routes/machines";
import { departmentsRouter } from "./routes/departments";
import { machineTypesRouter } from "./routes/machineTypes";
import { faultCategoriesRouter } from "./routes/faultCategories";
import { usersRouter } from "./routes/users";
import { calendarRouter } from "./routes/calendar";
import { externalCodesRouter } from "./routes/externalCodes";
import { settingsRouter } from "./routes/settings";
import { requireAuth, requireRole } from "./middleware/authenticate";
import { errorHandler, notFoundHandler } from "./middleware/errors";

export function createApp(opts: { logger?: Logger } = {}) {
  const app = express();
  const httpLogger = opts.logger ?? logger;

  app.use(
    pinoHttp({
      logger: httpLogger,
      genReqId: (req, res) => {
        const header = req.headers["x-request-id"];
        const id = (Array.isArray(header) ? header[0] : header) ?? randomUUID();
        res.setHeader("x-request-id", id);
        return id;
      },
      customProps: (req, res) => {
        if (!res.headersSent) return {};

        const r = req as unknown as {
          baseUrl?: string;
          route?: { path?: string };
        };
        const locals =
          (res as unknown as { locals?: { outcome?: string } }).locals ?? {};
        const route = r.route?.path
          ? `${r.baseUrl ?? ""}${r.route.path}`
          : r.baseUrl || undefined;
        return {
          route,
          outcome: locals.outcome ?? (res.statusCode < 400 ? "ok" : "error"),
        };
      },
    }),
  );

  app.use(cookieParser());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    const body: HealthResponse = { status: "ok" };
    res.status(200).json(body);
  });

  app.use("/auth", authRouter);

  app.use("/tickets", requireAuth, ticketsRouter);
  app.use("/knowledge", requireAuth, knowledgeRouter);
  app.use("/servicers", requireAuth, servicersRouter);
  app.use("/machines", requireAuth, machinesRouter);
  app.use("/departments", requireAuth, departmentsRouter);
  app.use("/machine-types", requireAuth, machineTypesRouter);
  app.use("/fault-categories", requireAuth, faultCategoriesRouter);
  app.use("/users", requireAuth, usersRouter);
  app.use("/calendar", requireAuth, requireRole("ADMIN"), calendarRouter);
  app.use("/external-codes", requireAuth, requireRole("ADMIN"), externalCodesRouter);
  app.use("/settings", requireAuth, requireRole("ADMIN"), settingsRouter);

  app.use("/ingest", ingestRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
