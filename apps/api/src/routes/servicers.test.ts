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

describe("servicers validation (admin, DB-free)", () => {
  it("GET /servicers without a cookie → 401", async () => {
    const res = await request(app).get("/servicers");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
  });

  it("POST /servicers without a name → 400", async () => {
    const res = await request(app)
      .post("/servicers")
      .set("Cookie", admin)
      .send({ email: "servis@example.com" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("POST /servicers with a malformed email → 400", async () => {
    const res = await request(app)
      .post("/servicers")
      .set("Cookie", admin)
      .send({ name: "Grafo servis", email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("POST /servicers with an unknown field → 400 (strict)", async () => {
    const res = await request(app)
      .post("/servicers")
      .set("Cookie", admin)
      .send({ name: "Grafo servis", email: "servis@example.com", vat: "SI123" });
    expect(res.status).toBe(400);
  });
});

describe("RBAC — a worker is refused servicer writes (403)", () => {
  it("POST /servicers as a worker → 403", async () => {
    const res = await request(app)
      .post("/servicers")
      .set("Cookie", worker)
      .send({ name: "Grafo servis", email: "servis@example.com" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
  });

  it("PATCH /servicers/:id as a worker → 403", async () => {
    const res = await request(app)
      .patch("/servicers/srv_x")
      .set("Cookie", worker)
      .send({ active: false });
    expect(res.status).toBe(403);
  });

  it("DELETE /servicers/:id as a worker → 403", async () => {
    const res = await request(app).delete("/servicers/srv_x").set("Cookie", worker);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
  });

  it("DELETE /servicers/:id without a cookie → 401", async () => {
    const res = await request(app).delete("/servicers/srv_x");
    expect(res.status).toBe(401);
  });
});
