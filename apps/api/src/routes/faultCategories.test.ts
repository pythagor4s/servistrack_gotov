import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { sessionCookie } from "../test-helpers";

const app = createApp();
let worker: string;
let admin: string;
beforeAll(async () => {
  worker = await sessionCookie({ id: "usr_w01", role: "TECHNICIAN" });
  admin = await sessionCookie({ id: "usr_a01", role: "ADMIN" });
});

describe("fault categories (DB-free)", () => {
  it("GET /fault-categories without a cookie → 401", async () => {
    const res = await request(app).get("/fault-categories");
    expect(res.status).toBe(401);
  });

  it("POST as a worker → 403 before validation", async () => {
    const res = await request(app)
      .post("/fault-categories")
      .set("Cookie", worker)
      .send({ name: "Hidravlika" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
  });

  it("POST with an icon outside the closed list → 400", async () => {
    const res = await request(app)
      .post("/fault-categories")
      .set("Cookie", admin)
      .send({ name: "Hidravlika", icon: "rocket" });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe("body.icon");
  });

  it("PATCH with an empty body → 400", async () => {
    const res = await request(app)
      .patch("/fault-categories/fc_zrak")
      .set("Cookie", admin)
      .send({});
    expect(res.status).toBe(400);
  });

  it("DELETE as a worker → 403", async () => {
    const res = await request(app).delete("/fault-categories/fc_zrak").set("Cookie", worker);
    expect(res.status).toBe(403);
  });
});
