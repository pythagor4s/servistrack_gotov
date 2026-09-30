import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { sessionCookie } from "../test-helpers";

const app = createApp();
let cookie: string;

beforeAll(async () => {
  cookie = await sessionCookie();
});

describe("input validation", () => {
  it("GET /health → 200 (public)", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
    expect(res.headers["x-request-id"]).toBeDefined();
  });

  it("GET /tickets without a session cookie → 401 (protected)", async () => {
    const res = await request(app).get("/tickets");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
  });

  it("GET /tickets with a bad status filter (authed) → 400 validation_error", async () => {
    const res = await request(app)
      .get("/tickets")
      .set("Cookie", cookie)
      .query({ status: "NOPE" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("POST /tickets with a missing title → 400 validation_error", async () => {
    const res = await request(app)
      .post("/tickets")
      .set("Cookie", cookie)
      .send({ priority: "HIGH" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
    expect(res.body.error.details).toBeInstanceOf(Array);
  });

  it("POST /tickets with a wrong-type priority → 400 validation_error", async () => {
    const res = await request(app)
      .post("/tickets")
      .set("Cookie", cookie)
      .send({ title: "Printer down", priority: 123 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("POST /tickets with an unknown extra field → 400 (strict schema)", async () => {
    const res = await request(app)
      .post("/tickets")
      .set("Cookie", cookie)
      .send({ title: "Printer down", role: "admin" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("unknown route → 404 not_found", async () => {
    const res = await request(app).get("/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("not_found");
  });
});
