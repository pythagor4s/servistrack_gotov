import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createHmac } from "node:crypto";
import { WebhookChannel } from "./webhook";
import { publicStatus, webhookSecretFor, webhookUrlFor } from "../../ingestStatus";
import { createApp } from "../../app";

describe("webhook config by source", () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it("finds the URL and the secret per source", () => {
    process.env.WEBHOOK_URL_DITRACK = "https://ditrack.local/hook";
    process.env.WEBHOOK_SECRET_DITRACK = "s1";
    process.env.WEBHOOK_URL_CHILLY_SCAN = "https://chilly.local/hook";
    expect(webhookUrlFor("ditrack")).toBe("https://ditrack.local/hook");
    expect(webhookUrlFor("chilly-scan")).toBe("https://chilly.local/hook");
    expect(webhookUrlFor("other")).toBeNull();
    expect(webhookUrlFor(null)).toBeNull();
    expect(webhookSecretFor("https://ditrack.local/hook")).toBe("s1");
    expect(webhookSecretFor("https://chilly.local/hook")).toBeNull();
  });
});

describe("WebhookChannel", () => {
  const env = { ...process.env };
  const fetchMock = vi.fn();
  beforeEach(() => {
    process.env.WEBHOOK_URL_DITRACK = "https://ditrack.local/hook";
    process.env.WEBHOOK_SECRET_DITRACK = "s1";
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
  });

  it("posts the body verbatim with an HMAC-SHA256 signature", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const body = JSON.stringify({ event: "ticket.status", eventId: "e1" });
    const r = await new WebhookChannel().send({ recipient: "https://ditrack.local/hook", subject: "ticket.status", body });
    expect(r).toEqual({ ok: true });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.body).toBe(body);
    expect(init.headers["x-servistrack-event"]).toBe("ticket.status");
    const expected = createHmac("sha256", "s1").update(body).digest("hex");
    expect(init.headers["x-servistrack-signature"]).toBe(`sha256=${expected}`);
  });

  it("treats a redirect or an error status as a failure (retry)", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 302 }));
    const r = await new WebhookChannel().send({ recipient: "https://ditrack.local/hook", subject: "x", body: "{}" });
    expect(r).toEqual({ ok: false, error: "HTTP 302" });
  });
});

describe("publicStatus", () => {
  it("exposes a narrow, labelled projection", () => {
    const now = new Date("2026-09-27T10:00:00Z");
    const out = publicStatus({
      id: "t1",
      number: 7,
      externalSource: "ditrack",
      externalId: "DT-1",
      status: "SERVICER_COMING",
      machineDown: true,
      servicerEta: now,
      resolution: null,
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
      assignedServicer: { name: "Print Tech" },
    } as unknown as Parameters<typeof publicStatus>[0]);
    expect(out).toMatchObject({ statusLabel: "Serviser prihaja", servicerName: "Print Tech", source: "ditrack" });
    expect(Object.keys(out)).not.toContain("reporterId");
  });
});

describe("GET /ingest/schema", () => {
  it("serves the ingest contract as JSON Schema without a key", async () => {
    const res = await request(createApp()).get("/ingest/schema");
    expect(res.status).toBe(200);
    expect(res.body.ticket.required).toEqual(["title"]);
    expect(res.body.ticket.properties.faultDate).toEqual({ type: "string", format: "date-time" });
    expect(res.body.ticket.additionalProperties).toBe(false);
  });
});
