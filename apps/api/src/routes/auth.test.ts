import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { sessionCookie } from "../test-helpers";

const app = createApp();

describe("auth + ingest", () => {
  it("POST /auth/login with a missing password → 400", async () => {
    const res = await request(app).post("/auth/login").send({ username: "andraz" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("POST /auth/login with an unknown extra field → 400 (strict schema)", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ username: "andraz", password: "x", email: "a@b.com" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("GET /auth/me without a cookie → 401 unauthorized", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
  });

  it("GET /auth/me with a garbage cookie → 401 unauthorized", async () => {
    const res = await request(app)
      .get("/auth/me")
      .set("Cookie", "st_session=not.a.jwt");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
  });

  it("POST /ingest/notifications without an API key → 401 unauthorized", async () => {
    const res = await request(app)
      .post("/ingest/notifications")
      .send({ ticketId: "tkt_001", channel: "EMAIL", recipient: "x@y.com" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
  });
});

describe("PATCH /auth/me/preferences (DB-free)", () => {
  it("without a cookie → 401 unauthorized", async () => {
    const res = await request(app).patch("/auth/me/preferences").send({ theme: "LIGHT" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
  });

  it("with an empty body → 400 (at least one field)", async () => {
    const res = await request(app)
      .patch("/auth/me/preferences")
      .set("Cookie", await sessionCookie({ id: "usr_w01", role: "TECHNICIAN" }))
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("with a value outside the enum → 400", async () => {
    const res = await request(app)
      .patch("/auth/me/preferences")
      .set("Cookie", await sessionCookie({ id: "usr_w01", role: "TECHNICIAN" }))
      .send({ viewTickets: "GRID" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("with an unknown field → 400 (strict schema)", async () => {
    const res = await request(app)
      .patch("/auth/me/preferences")
      .set("Cookie", await sessionCookie({ id: "usr_w01", role: "TECHNICIAN" }))
      .send({ id: "usr_admin", theme: "LIGHT" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });
});
