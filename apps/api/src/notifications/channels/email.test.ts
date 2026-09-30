import { afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { EmailChannel, emailConfigured, mailFrom } from "./email";
import { createApp } from "../../app";
import { sessionCookie } from "../../test-helpers";

describe("EmailChannel without SMTP", () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it("fails fast with a readable reason instead of dialling localhost", async () => {
    delete process.env.SMTP_HOST;
    expect(emailConfigured()).toBe(false);
    const r = await new EmailChannel().send({ recipient: "a@b.si", subject: "s", body: "b" });
    expect(r).toEqual({ ok: false, error: "SMTP ni nastavljen (SMTP_HOST)" });
  });

  it("takes the sender from MAIL_FROM", () => {
    process.env.MAIL_FROM = "ServisTrack <it@vtisk.si>";
    expect(mailFrom()).toBe("ServisTrack <it@vtisk.si>");
  });
});

describe("/settings (DB-free)", () => {
  const app = createApp();
  let worker: string;
  let admin: string;
  beforeAll(async () => {
    worker = await sessionCookie({ id: "usr_w01", role: "TECHNICIAN" });
    admin = await sessionCookie({ id: "usr_admin", role: "ADMIN" });
  });

  it("GET /settings/email as a worker → 403", async () => {
    const res = await request(app).get("/settings/email").set("Cookie", worker);
    expect(res.status).toBe(403);
  });

  it("POST /settings/email/test with a malformed address → 400", async () => {
    const res = await request(app).post("/settings/email/test").set("Cookie", admin).send({ to: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });
});
