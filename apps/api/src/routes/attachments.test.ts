import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { sessionCookie } from "../test-helpers";
import { contentDisposition, decodeOriginalName } from "./tickets";

const app = createApp();
let admin: string;
let worker: string;
beforeAll(async () => {
  admin = await sessionCookie({ id: "usr_admin", role: "ADMIN" });
  worker = await sessionCookie({ id: "usr_w01", role: "TECHNICIAN" });
});

const realPdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF");
const notPdf = Buffer.from("MZ\x90\x00\x03");

describe("attachments — authentication", () => {
  it("GET download without a cookie → 401", async () => {
    const res = await request(app).get("/tickets/tkt_001/attachments/att_1/download");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
  });

  it("DELETE without a cookie → 401", async () => {
    const res = await request(app).delete("/tickets/tkt_001/attachments/att_1");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
  });

  it("POST upload without a cookie → 401", async () => {
    const res = await request(app).post("/tickets/tkt_001/attachments");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
  });
});

describe("attachments — RBAC (writes are admin-only, reads are not)", () => {
  it("POST upload as a worker → 403 forbidden", async () => {
    const res = await request(app)
      .post("/tickets/tkt_001/attachments")
      .set("Cookie", worker)
      .attach("file", realPdf, { filename: "wo.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
  });

  it("DELETE as a worker → 403 forbidden", async () => {
    const res = await request(app)
      .delete("/tickets/tkt_001/attachments/att_1")
      .set("Cookie", worker);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
  });

});

describe("attachments — upload validation (before any DB access)", () => {
  it("POST upload with no file → 400 validation_error", async () => {
    const res = await request(app)
      .post("/tickets/tkt_001/attachments")
      .set("Cookie", admin);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("POST upload of a non-PDF content type → 400 validation_error", async () => {
    const res = await request(app)
      .post("/tickets/tkt_001/attachments")
      .set("Cookie", admin)
      .attach("file", Buffer.from("hello"), {
        filename: "notes.txt",
        contentType: "text/plain",
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("POST upload claiming application/pdf but with non-PDF bytes → 400", async () => {
    const res = await request(app)
      .post("/tickets/tkt_001/attachments")
      .set("Cookie", admin)
      .attach("file", notPdf, {
        filename: "payload.pdf",
        contentType: "application/pdf",
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
    expect(res.body.error.message).toBe("Only PDF files are allowed");
  });
});

describe("attachments — filename handling", () => {
  it("restores a UTF-8 name that busboy decoded as latin1", () => {
    const asBusboySeesIt = Buffer.from("poročilo-šž.pdf", "utf8").toString("latin1");
    expect(asBusboySeesIt).not.toBe("poročilo-šž.pdf");
    expect(decodeOriginalName(asBusboySeesIt)).toBe("poročilo-šž.pdf");
  });

  it("leaves a plain ASCII name untouched", () => {
    expect(decodeOriginalName("work-order-4471.pdf")).toBe("work-order-4471.pdf");
  });

  it("keeps the original when the bytes are not valid UTF-8", () => {
    const notUtf8 = "ÿþ.pdf";
    expect(decodeOriginalName(notUtf8)).toBe(notUtf8);
  });

  it("neutralises a quote + CRLF filename instead of injecting a header", () => {
    const header = contentDisposition('ev"il\r\nX-Injected: yes.pdf');
    expect(header).not.toMatch(/[\r\n]/);
    expect(header.split('filename="')[1]!.split('"')[0]).not.toContain('"');
    expect(header).not.toContain("X-Injected: yes.pdf\r");
  });

  it("carries a non-ASCII name losslessly in the RFC 5987 parameter", () => {
    const header = contentDisposition("poročilo-šž-č.pdf");
    const encoded = header.split("UTF-8''")[1]!;
    expect(decodeURIComponent(encoded)).toBe("poročilo-šž-č.pdf");
    const ascii = header.split('filename="')[1]!.split('"')[0]!;
    expect(/^[\x20-\x7e]*$/.test(ascii)).toBe(true);
  });
});
