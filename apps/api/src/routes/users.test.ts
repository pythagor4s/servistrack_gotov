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

describe("users validation + RBAC (DB-free)", () => {
  it("GET /users without a cookie → 401", async () => {
    const res = await request(app).get("/users");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
  });

  it("GET /users as a worker → 403", async () => {
    const res = await request(app).get("/users").set("Cookie", worker);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
  });

  it("PATCH /users/:id as a worker → 403", async () => {
    const res = await request(app)
      .patch("/users/usr_w02")
      .set("Cookie", worker)
      .send({ active: false });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
  });

  it("PATCH /users/:id with an empty body → 400 (at least one field)", async () => {
    const res = await request(app).patch("/users/usr_w02").set("Cookie", admin).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("PATCH /users/:id with an unknown field → 400 (strict schema)", async () => {
    const res = await request(app)
      .patch("/users/usr_w02")
      .set("Cookie", admin)
      .send({ username: "renamed" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("PATCH /users/:id with a wrong-type active → 400", async () => {
    const res = await request(app)
      .patch("/users/usr_w02")
      .set("Cookie", admin)
      .send({ active: "no" });
    expect(res.status).toBe(400);
  });

  it("PATCH /users/:id with a bad phone → 400", async () => {
    const res = await request(app)
      .patch("/users/usr_w02")
      .set("Cookie", admin)
      .send({ phone: "call me maybe" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("POST /users with a too-short password → 400", async () => {
    const res = await request(app)
      .post("/users")
      .set("Cookie", admin)
      .send({ username: "newguy", name: "New Guy", password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("POST /users with a malformed email → 400", async () => {
    const res = await request(app)
      .post("/users")
      .set("Cookie", admin)
      .send({ username: "newguy", name: "New Guy", password: "longenough", email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("PATCH /users/:id with a malformed email → 400", async () => {
    const res = await request(app)
      .patch("/users/usr_w02")
      .set("Cookie", admin)
      .send({ email: "maja@" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("PATCH /users/:id with an empty departmentId → 400", async () => {
    const res = await request(app)
      .patch("/users/usr_w02")
      .set("Cookie", admin)
      .send({ departmentId: "" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });
});

function jpegHead(w: number, h: number): Buffer {
  const parts: number[] = [0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08];
  parts.push((h >> 8) & 0xff, h & 0xff, (w >> 8) & 0xff, w & 0xff);
  parts.push(...Array.from({ length: 10 }, () => 0x00));
  return Buffer.from(parts);
}

describe("user image upload validation (admin, DB-free)", () => {
  it("GET /users/:id/image without a cookie → 401", async () => {
    const res = await request(app).get("/users/usr_w01/image");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
  });

  it("POST /users/:id/image as a worker → 403", async () => {
    const res = await request(app).post("/users/usr_w01/image").set("Cookie", worker);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
  });

  it("DELETE /users/:id/image as a worker → 403", async () => {
    const res = await request(app).delete("/users/usr_w01/image").set("Cookie", worker);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
  });

  it("POST with no file → 400", async () => {
    const res = await request(app).post("/users/usr_w01/image").set("Cookie", admin);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("POST a PDF → 400 (mime not allowed)", async () => {
    const res = await request(app)
      .post("/users/usr_w01/image")
      .set("Cookie", admin)
      .attach("file", Buffer.from("%PDF-1.7 padding"), {
        filename: "x.pdf",
        contentType: "application/pdf",
      });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/PNG, WebP and JPEG/);
  });

  it("POST bytes that are not really a JPEG → 400, even with the right mime", async () => {
    const res = await request(app)
      .post("/users/usr_w01/image")
      .set("Cookie", admin)
      .attach("file", Buffer.from("not an image at all, but claimed to be one"), {
        filename: "x.jpg",
        contentType: "image/jpeg",
      });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/not a valid PNG, WebP or JPEG/);
  });

  it("POST a square image below the minimum → 400, naming both dimensions", async () => {
    const res = await request(app)
      .post("/users/usr_w01/image")
      .set("Cookie", admin)
      .attach("file", jpegHead(64, 64), { filename: "x.jpg", contentType: "image/jpeg" });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("128");
    expect(res.body.error.message).toContain("64x64");
  });

  it("POST a non-square image inside the size range → 400 (square)", async () => {
    const res = await request(app)
      .post("/users/usr_w01/image")
      .set("Cookie", admin)
      .attach("file", jpegHead(800, 400), { filename: "x.jpg", contentType: "image/jpeg" });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/square/);
    expect(res.body.error.message).toContain("800x400");
  });
});
