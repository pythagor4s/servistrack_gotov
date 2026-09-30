import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { sessionCookie } from "../test-helpers";

const app = createApp();
let admin: string;
let worker: string;
beforeAll(async () => {
  admin = await sessionCookie({ id: "usr_admin", role: "ADMIN" });
  worker = await sessionCookie({ id: "usr_w01", role: "TECHNICIAN" });
});

describe("servicer + workflow validation (admin, DB-free)", () => {
  it("GET /servicers without a cookie → 401", async () => {
    const res = await request(app).get("/servicers");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
  });

  it("POST /servicers without a name → 400", async () => {
    const res = await request(app)
      .post("/servicers")
      .set("Cookie", admin)
      .send({ email: "a@b.com" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("POST /servicers with a bad email → 400", async () => {
    const res = await request(app)
      .post("/servicers")
      .set("Cookie", admin)
      .send({ name: "X", email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("POST /tickets/:id/forward without servicerId/channels → 400", async () => {
    const res = await request(app)
      .post("/tickets/tkt_001/forward")
      .set("Cookie", admin)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("POST /tickets/:id/close without a resolution → 400", async () => {
    const res = await request(app)
      .post("/tickets/tkt_001/close")
      .set("Cookie", admin)
      .send({});
    expect(res.status).toBe(400);
  });

  it("PATCH /tickets/:id with an empty assignedServicerId → 400", async () => {
    const res = await request(app)
      .patch("/tickets/tkt_001")
      .set("Cookie", admin)
      .send({ assignedServicerId: "" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("POST /users without a name → 400", async () => {
    const res = await request(app)
      .post("/users")
      .set("Cookie", admin)
      .send({ username: "newguy", password: "longenough" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("POST /ingest/tickets without an API key → 401", async () => {
    const res = await request(app)
      .post("/ingest/tickets")
      .send({ title: "Fault" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
  });
});

describe("RBAC — a worker is refused admin-only actions (403)", () => {
  it("POST /servicers as a worker → 403 forbidden", async () => {
    const res = await request(app)
      .post("/servicers")
      .set("Cookie", worker)
      .send({ name: "X", email: "a@b.com" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
  });

  it("POST /tickets/:id/forward as a worker → 403 forbidden", async () => {
    const res = await request(app)
      .post("/tickets/tkt_001/forward")
      .set("Cookie", worker)
      .send({ servicerId: "svc_it", channels: ["EMAIL"] });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
  });

  it("PATCH /tickets/:id { assignedServicerId } as a worker → 403 forbidden", async () => {
    const res = await request(app)
      .patch("/tickets/tkt_001")
      .set("Cookie", worker)
      .send({ assignedServicerId: "svc_it" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
  });

  it("POST /tickets/:id/close as a worker → 403 forbidden", async () => {
    const res = await request(app)
      .post("/tickets/tkt_001/close")
      .set("Cookie", worker)
      .send({ resolution: "fixed" });
    expect(res.status).toBe(403);
  });

  it("DELETE /tickets/:id as a worker → 403 forbidden", async () => {
    const res = await request(app)
      .delete("/tickets/tkt_001")
      .set("Cookie", worker);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
  });

  it("DELETE /tickets/:id/attachments/:attId as a worker → 403 forbidden", async () => {
    const res = await request(app)
      .delete("/tickets/tkt_001/attachments/att_x")
      .set("Cookie", worker);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
  });

  it("POST /users as a worker → 403 forbidden", async () => {
    const res = await request(app)
      .post("/users")
      .set("Cookie", worker)
      .send({ username: "newguy", name: "New Guy", password: "longenough" });
    expect(res.status).toBe(403);
  });

  it("PATCH /tickets/:id status as a worker → 403 (workflow is admin-only)", async () => {
    const res = await request(app)
      .patch("/tickets/tkt_001")
      .set("Cookie", worker)
      .send({ status: "IN_PROGRESS" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
  });
});
