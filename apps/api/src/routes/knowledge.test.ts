import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { sessionCookie } from "../test-helpers";

const app = createApp();
let cookie: string;
beforeAll(async () => {
  cookie = await sessionCookie({ id: "usr_w01", role: "TECHNICIAN" });
});

describe("knowledge base (DB-free)", () => {
  it("GET /knowledge without a cookie → 401", async () => {
    const res = await request(app).get("/knowledge");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
  });

  it("POST /knowledge without a cookie → 401", async () => {
    const res = await request(app)
      .post("/knowledge")
      .send({ title: "X", body: "Y" });
    expect(res.status).toBe(401);
  });

  it("POST /knowledge without a title → 400 (authed)", async () => {
    const res = await request(app)
      .post("/knowledge")
      .set("Cookie", cookie)
      .send({ body: "Only a body" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("PATCH /knowledge/:id with an empty body → 400 (authed)", async () => {
    const res = await request(app)
      .patch("/knowledge/kb_001")
      .set("Cookie", cookie)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("POST /knowledge with more than 12 tags → 400", async () => {
    const res = await request(app)
      .post("/knowledge")
      .set("Cookie", cookie)
      .send({ title: "X", body: "Y", tags: Array.from({ length: 13 }, (_, i) => `t${i}`) });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe("body.tags");
  });
});

describe("knowledge search, diagnose, feedback (DB-free)", () => {
  it("GET /knowledge/search without a cookie → 401", async () => {
    const res = await request(app).get("/knowledge/search?q=podtlak");
    expect(res.status).toBe(401);
  });

  it.each([
    ["sort=best", "query.sort"],
    ["limit=500", "query.limit"],
    ["source=email", "query.source"],
    ["pinned=maybe", "query.pinned"],
    ["type=PRINTER", "query.type"],
    [`q=${"a".repeat(501)}`, "query.q"],
  ])("GET /knowledge/search?%s → 400 on %s", async (qs, path) => {
    const res = await request(app).get(`/knowledge/search?${qs}`).set("Cookie", cookie);
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toContain(path);
  });

  it("POST /knowledge/diagnose without a description → 400", async () => {
    const res = await request(app).post("/knowledge/diagnose").set("Cookie", cookie).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe("body.description");
  });

  it("POST /knowledge/diagnose with an unknown key → 400 (strict body)", async () => {
    const res = await request(app)
      .post("/knowledge/diagnose")
      .set("Cookie", cookie)
      .send({ description: "podtlak ne drži", admin: true });
    expect(res.status).toBe(400);
  });

  it("PUT /knowledge/:id/feedback with a non-boolean → 400", async () => {
    const res = await request(app)
      .put("/knowledge/kb_001/feedback")
      .set("Cookie", cookie)
      .send({ helpful: "yes" });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe("body.helpful");
  });

  it("POST /knowledge/:id/view without a cookie → 401", async () => {
    const res = await request(app).post("/knowledge/kb_001/view");
    expect(res.status).toBe(401);
  });
});
