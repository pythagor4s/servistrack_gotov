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

const valid = {
  title: "Menjava hladilne tekočine",
  date: "2026-09-21",
  startMinute: 8 * 60,
  endMinute: 9 * 60,
};

describe("calendar auth", () => {
  it("GET /calendar/tasks without a cookie → 401", async () => {
    const res = await request(app).get("/calendar/tasks?from=2026-09-01&to=2026-09-30");
    expect(res.status).toBe(401);
  });

  it("GET /calendar/tasks as a worker → 403", async () => {
    const res = await request(app)
      .get("/calendar/tasks?from=2026-09-01&to=2026-09-30")
      .set("Cookie", worker);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
  });

  it("POST /calendar/tasks as a worker → 403", async () => {
    const res = await request(app).post("/calendar/tasks").set("Cookie", worker).send(valid);
    expect(res.status).toBe(403);
  });

  it("POST /calendar/categories as a worker → 403", async () => {
    const res = await request(app)
      .post("/calendar/categories")
      .set("Cookie", worker)
      .send({ name: "Kalibracija" });
    expect(res.status).toBe(403);
  });
});

describe("calendar validation (admin, DB-free)", () => {
  const post = (body: object) =>
    request(app).post("/calendar/tasks").set("Cookie", admin).send(body);

  it("POST without a title → 400", async () => {
    const res = await post({ ...valid, title: "  " });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("POST starting before 06:00 → 400", async () => {
    const res = await post({ ...valid, startMinute: 5 * 60 + 45 });
    expect(res.status).toBe(400);
  });

  it("POST ending after 17:00 → 400", async () => {
    const res = await post({ ...valid, endMinute: 17 * 60 + 15 });
    expect(res.status).toBe(400);
  });

  it("POST ending before it starts → 400", async () => {
    const res = await post({ ...valid, startMinute: 10 * 60, endMinute: 9 * 60 });
    expect(res.status).toBe(400);
    expect(res.body.error.details.some((d: { path: string }) => d.path === "body.endMinute")).toBe(true);
  });

  it("POST with only a start time → 400", async () => {
    const res = await post({ title: valid.title, date: valid.date, startMinute: 8 * 60 });
    expect(res.status).toBe(400);
  });

  it("POST off the 15-minute step → 400", async () => {
    const res = await post({ ...valid, startMinute: 8 * 60 + 7 });
    expect(res.status).toBe(400);
  });

  it("POST on a Saturday → 400 (not a working day)", async () => {
    const res = await post({ ...valid, date: "2026-09-19" });
    expect(res.status).toBe(400);
    expect(res.body.error.details.some((d: { path: string }) => d.path === "body.date")).toBe(true);
  });

  it("POST with a date that does not exist → 400", async () => {
    const res = await post({ ...valid, date: "2026-02-30" });
    expect(res.status).toBe(400);
  });

  it("POST with recurrenceUntil before the date → 400", async () => {
    const res = await post({ ...valid, recurrenceUnit: "WEEK", recurrenceUntil: "2026-09-01" });
    expect(res.status).toBe(400);
  });

  it("POST with recurrenceUntil but no recurrence → 400", async () => {
    const res = await post({ ...valid, recurrenceUntil: "2026-12-31" });
    expect(res.status).toBe(400);
  });

  it("POST with an unknown recurrence unit → 400", async () => {
    const res = await post({ ...valid, recurrenceUnit: "DAY" });
    expect(res.status).toBe(400);
  });

  it("POST with an unknown field → 400 (strict)", async () => {
    const res = await post({ ...valid, priority: "HIGH" });
    expect(res.status).toBe(400);
  });

  it("GET with a range longer than 92 days → 400", async () => {
    const res = await request(app)
      .get("/calendar/tasks?from=2026-01-01&to=2026-04-03")
      .set("Cookie", admin);
    expect(res.status).toBe(400);
  });

  it("GET with the range reversed → 400", async () => {
    const res = await request(app)
      .get("/calendar/tasks?from=2026-09-30&to=2026-09-01")
      .set("Cookie", admin);
    expect(res.status).toBe(400);
  });

  it("POST a completion without a valid date → 400", async () => {
    const res = await request(app)
      .post("/calendar/tasks/abc/completions")
      .set("Cookie", admin)
      .send({ date: "21.09.2026" });
    expect(res.status).toBe(400);
  });

  it("POST a category with an unknown colour → 400", async () => {
    const res = await request(app)
      .post("/calendar/categories")
      .set("Cookie", admin)
      .send({ name: "Kalibracija", color: "PINK" });
    expect(res.status).toBe(400);
  });
});
