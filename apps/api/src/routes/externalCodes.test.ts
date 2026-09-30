import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { ingestTicketSchema, updateTicketSchema } from "@servis-track/shared";
import { createApp } from "../app";
import { sessionCookie } from "../test-helpers";

const app = createApp();
let admin: string;
let worker: string;
beforeAll(async () => {
  admin = await sessionCookie({ id: "usr_admin", role: "ADMIN" });
  worker = await sessionCookie({ id: "usr_w01", role: "TECHNICIAN" });
});

describe("ingest contract (schema)", () => {
  it("accepts the old minimal body unchanged", () => {
    expect(ingestTicketSchema.safeParse({ title: "Fault" }).success).toBe(true);
  });

  it("accepts the full DiTrack body", () => {
    const parsed = ingestTicketSchema.safeParse({
      title: "Glava se ne cisti",
      description: "Po menjavi crnila glava 3 pusca pasove.",
      externalId: "DT-2026-000123",
      machineCode: "NOCH-2",
      machineName: "Tiskanje Tekstili / NOCH",
      departmentCode: "TISK",
      categoryCode: "GLAVE",
      reporterWorkerNo: "148",
      faultDate: "2026-09-27T08:15:00Z",
      priority: "HIGH",
    });
    expect(parsed.success).toBe(true);
  });

  it("still rejects unknown keys (strict)", () => {
    expect(ingestTicketSchema.safeParse({ title: "x", station: "NOCH" }).success).toBe(false);
  });

  it("rejects an empty or over-long code", () => {
    expect(ingestTicketSchema.safeParse({ title: "x", machineCode: "  " }).success).toBe(false);
    expect(ingestTicketSchema.safeParse({ title: "x", machineCode: "a".repeat(65) }).success).toBe(false);
  });

  it("rejects an over-long description", () => {
    expect(ingestTicketSchema.safeParse({ title: "x", description: "a".repeat(4001) }).success).toBe(false);
  });

  it("PATCH accepts categoryId and null", () => {
    expect(updateTicketSchema.safeParse({ categoryId: "cat_1" }).success).toBe(true);
    expect(updateTicketSchema.safeParse({ categoryId: null }).success).toBe(true);
    expect(updateTicketSchema.safeParse({ categoryId: "" }).success).toBe(false);
  });
});

describe("/external-codes (DB-free)", () => {
  it("GET without a cookie → 401", async () => {
    const res = await request(app).get("/external-codes");
    expect(res.status).toBe(401);
  });

  it("GET as a worker → 403", async () => {
    const res = await request(app).get("/external-codes").set("Cookie", worker);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
  });

  it("POST with an unknown kind → 400", async () => {
    const res = await request(app)
      .post("/external-codes")
      .set("Cookie", admin)
      .send({ kind: "PRINTER", code: "X" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("PATCH without targetId → 400", async () => {
    const res = await request(app).patch("/external-codes/ec_1").set("Cookie", admin).send({});
    expect(res.status).toBe(400);
  });
});

describe("ticket comments (DB-free)", () => {
  it("POST /tickets/:id/comments without a cookie → 401", async () => {
    const res = await request(app).post("/tickets/t1/comments").send({ body: "x" });
    expect(res.status).toBe(401);
  });

  it("POST /tickets/:id/comments with an empty body → 400", async () => {
    const res = await request(app).post("/tickets/t1/comments").set("Cookie", worker).send({ body: "   " });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("POST /tickets/:id/comments with an unknown key → 400", async () => {
    const res = await request(app)
      .post("/tickets/t1/comments")
      .set("Cookie", admin)
      .send({ body: "x", authorId: "usr_admin" });
    expect(res.status).toBe(400);
  });

  it("PATCH /auth/me/preferences rejects a non-boolean notifyEmail → 400", async () => {
    const res = await request(app).patch("/auth/me/preferences").set("Cookie", worker).send({ notifyEmail: "yes" });
    expect(res.status).toBe(400);
  });
});

describe("downtime, servicer ETA, sources (DB-free)", () => {
  it("a worker may not set the servicer ETA → 403", async () => {
    const res = await request(app)
      .patch("/tickets/t1")
      .set("Cookie", worker)
      .send({ servicerEta: "2026-09-29T09:00:00Z" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
  });

  it("PATCH rejects a malformed ETA → 400", async () => {
    const res = await request(app).patch("/tickets/t1").set("Cookie", admin).send({ servicerEta: "jutri" });
    expect(res.status).toBe(400);
  });

  it("ingest schema lower-cases the source and rejects a non-slug", () => {
    const ok = ingestTicketSchema.safeParse({ title: "x", source: "ChillyScan" });
    expect(ok.success && ok.data.source).toBe("chillyscan");
    expect(ingestTicketSchema.safeParse({ title: "x", source: "bad source" }).success).toBe(false);
  });

  it("ingest schema accepts machineDown and workOrderNo", () => {
    const r = ingestTicketSchema.safeParse({ title: "x", machineDown: true, workOrderNo: "DN-4711" });
    expect(r.success).toBe(true);
    expect(ingestTicketSchema.safeParse({ title: "x", machineDown: "yes" }).success).toBe(false);
  });
});

describe("service cost (DB-free)", () => {
  it("a worker may not set the service cost → 403", async () => {
    const res = await request(app).patch("/tickets/t1").set("Cookie", worker).send({ serviceCostCents: 100 });
    expect(res.status).toBe(403);
  });
});

describe("manual reporter notification (DB-free)", () => {
  it("a worker may not notify the reporter → 403", async () => {
    const res = await request(app).post("/tickets/t1/notify-reporter").set("Cookie", worker).send({ subject: "s", body: "b" });
    expect(res.status).toBe(403);
  });

  it("an empty body → 400", async () => {
    const res = await request(app).post("/tickets/t1/notify-reporter").set("Cookie", admin).send({ subject: "s", body: " " });
    expect(res.status).toBe(400);
  });
});
