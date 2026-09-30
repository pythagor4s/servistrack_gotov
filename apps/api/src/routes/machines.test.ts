import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { sessionCookie } from "../test-helpers";
import { readImageHeader } from "../images";

function png(w: number, h: number): Buffer {
  const buf = Buffer.alloc(24);
  buf.writeUInt32BE(0x89504e47, 0);
  buf.writeUInt32BE(0x0d0a1a0a, 4);
  buf.writeUInt32BE(13, 8);
  buf.write("IHDR", 12, "latin1");
  buf.writeUInt32BE(w, 16);
  buf.writeUInt32BE(h, 20);
  return buf;
}

function webpHead(chunk: string): Buffer {
  const buf = Buffer.alloc(30);
  buf.write("RIFF", 0, "latin1");
  buf.write("WEBP", 8, "latin1");
  buf.write(chunk, 12, "latin1");
  return buf;
}

function webpVp8x(w: number, h: number): Buffer {
  const buf = webpHead("VP8X");
  buf.writeUIntLE(w - 1, 24, 3);
  buf.writeUIntLE(h - 1, 27, 3);
  return buf;
}

function webpVp8(w: number, h: number): Buffer {
  const buf = webpHead("VP8 ");
  buf[23] = 0x9d;
  buf[24] = 0x01;
  buf[25] = 0x2a;
  buf.writeUInt16LE(w, 26);
  buf.writeUInt16LE(h, 28);
  return buf;
}

function webpVp8l(w: number, h: number): Buffer {
  const buf = webpHead("VP8L");
  buf[20] = 0x2f;
  buf.writeUInt32LE(((w - 1) & 0x3fff) | (((h - 1) & 0x3fff) << 14), 21);
  return buf;
}

const app = createApp();
let admin: string;
let worker: string;
beforeAll(async () => {
  admin = await sessionCookie({ id: "usr_admin", role: "ADMIN" });
  worker = await sessionCookie({ id: "usr_w01", role: "TECHNICIAN" });
});

describe("machines + departments validation (admin, DB-free)", () => {
  it("GET /machines without a cookie → 401", async () => {
    const res = await request(app).get("/machines");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
  });

  it("POST /machines without brand/model → 400", async () => {
    const res = await request(app).post("/machines").set("Cookie", admin).send({ brand: "Zünd" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("POST /machines with an unknown field → 400 (strict)", async () => {
    const res = await request(app)
      .post("/machines")
      .set("Cookie", admin)
      .send({ brand: "Zünd", model: "G3", colour: "red" });
    expect(res.status).toBe(400);
  });

  it("POST /departments without a name → 400", async () => {
    const res = await request(app).post("/departments").set("Cookie", admin).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });
});

describe("RBAC — a worker is refused machine/department writes (403)", () => {
  it("POST /machines as a worker → 403", async () => {
    const res = await request(app)
      .post("/machines")
      .set("Cookie", worker)
      .send({ brand: "Zünd", model: "G3" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
  });

  it("PATCH /machines/:id as a worker → 403", async () => {
    const res = await request(app)
      .patch("/machines/mac_x")
      .set("Cookie", worker)
      .send({ brand: "X" });
    expect(res.status).toBe(403);
  });

  it("DELETE /machines/:id as a worker → 403", async () => {
    const res = await request(app).delete("/machines/mac_x").set("Cookie", worker);
    expect(res.status).toBe(403);
  });

  it("POST /departments as a worker → 403", async () => {
    const res = await request(app)
      .post("/departments")
      .set("Cookie", worker)
      .send({ name: "Print hall" });
    expect(res.status).toBe(403);
  });

  it("DELETE /departments/:id as a worker → 403", async () => {
    const res = await request(app).delete("/departments/dep_x").set("Cookie", worker);
    expect(res.status).toBe(403);
  });

  it("POST /machines/:id/image as a worker → 403", async () => {
    const res = await request(app)
      .post("/machines/mac_x/image")
      .set("Cookie", worker)
      .attach("file", png(600, 400), { filename: "x.png", contentType: "image/png" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
  });

  it("DELETE /machines/:id/image as a worker → 403", async () => {
    const res = await request(app).delete("/machines/mac_x/image").set("Cookie", worker);
    expect(res.status).toBe(403);
  });
});

describe("machine image upload validation (admin, DB-free)", () => {
  it("GET /machines/:id/image without a cookie → 401", async () => {
    const res = await request(app).get("/machines/mac_x/image");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
  });

  it("POST with no file → 400", async () => {
    const res = await request(app).post("/machines/mac_x/image").set("Cookie", admin);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("POST a JPEG → 400 (mime not allowed)", async () => {
    const res = await request(app)
      .post("/machines/mac_x/image")
      .set("Cookie", admin)
      .attach("file", Buffer.from([0xff, 0xd8, 0xff, 0xe0]), {
        filename: "x.jpg",
        contentType: "image/jpeg",
      });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/PNG and WebP/);
  });

  it("POST bytes that are not really a PNG → 400, even with the right mime", async () => {
    const res = await request(app)
      .post("/machines/mac_x/image")
      .set("Cookie", admin)
      .attach("file", Buffer.from("not an image at all, but claimed to be one"), {
        filename: "x.png",
        contentType: "image/png",
      });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/not a valid PNG or WebP/);
  });

  it("POST a PNG of the wrong size → 400, naming both dimensions", async () => {
    const res = await request(app)
      .post("/machines/mac_x/image")
      .set("Cookie", admin)
      .attach("file", png(1024, 768), { filename: "x.png", contentType: "image/png" });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("600x400");
    expect(res.body.error.message).toContain("1024x768");
  });

  it("POST a WebP declared as PNG → 400 (declared type must match the bytes)", async () => {
    const res = await request(app)
      .post("/machines/mac_x/image")
      .set("Cookie", admin)
      .attach("file", webpVp8x(600, 400), { filename: "x.png", contentType: "image/png" });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/not a valid PNG or WebP/);
  });
});

describe("readImageHeader", () => {
  it("reads a PNG's IHDR", () => {
    expect(readImageHeader(png(600, 400))).toEqual({ format: "png", width: 600, height: 400 });
  });

  it("reads all three WebP encodings", () => {
    expect(readImageHeader(webpVp8x(600, 400))).toEqual({ format: "webp", width: 600, height: 400 });
    expect(readImageHeader(webpVp8(600, 400))).toEqual({ format: "webp", width: 600, height: 400 });
    expect(readImageHeader(webpVp8l(600, 400))).toEqual({ format: "webp", width: 600, height: 400 });
  });

  it("returns null for anything else", () => {
    expect(readImageHeader(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBeNull();
    expect(readImageHeader(Buffer.from("%PDF-1.7 and then some padding bytes"))).toBeNull();
    expect(readImageHeader(Buffer.alloc(0))).toBeNull();
    const truncated = png(600, 400);
    truncated.write("XXXX", 12, "latin1");
    expect(readImageHeader(truncated)).toBeNull();
  });
});
