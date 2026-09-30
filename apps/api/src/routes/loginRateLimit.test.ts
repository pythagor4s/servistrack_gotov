import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import type { Request, Response, NextFunction } from "express";
import { createApp } from "../app";
import {
  createLoginLimiter,
  loginLimiter,
  LOGIN_MAX_FAILURES,
} from "../middleware/loginRateLimit";

const app = createApp();

function fakeRes() {
  const res = {
    locals: { valid: { body: { username: "andraz", password: "x" } } } as Record<string, unknown>,
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

function run(middleware: ReturnType<typeof createLoginLimiter>["middleware"], res: ReturnType<typeof fakeRes>) {
  let passed = false;
  middleware({} as Request, res as unknown as Response, (() => {
    passed = true;
  }) as NextFunction);
  return passed;
}

describe("omejitev neuspelih prijav", () => {
  afterEach(() => {
    loginLimiter.reset();
  });

  it("pusti naprej, dokler je neuspehov manj od meje", () => {
    const limiter = createLoginLimiter({ maxFailures: 3, windowMs: 1000 });
    limiter.recordFailure("andraz");
    limiter.recordFailure("andraz");
    expect(run(limiter.middleware, fakeRes())).toBe(true);
  });

  it("zavrne, ko je meja dosezena, in pove Retry-After", () => {
    const limiter = createLoginLimiter({ maxFailures: 3, windowMs: 60_000 });
    for (let i = 0; i < 3; i++) limiter.recordFailure("andraz");

    const res = fakeRes();
    expect(run(limiter.middleware, res)).toBe(false);
    expect(res.statusCode).toBe(429);
    expect((res.body as { error: { code: string } }).error.code).toBe("too_many_requests");
    expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("zapora se sama sprosti, ko okno potece", () => {
    let t = 0;
    const limiter = createLoginLimiter({ maxFailures: 2, windowMs: 1000, now: () => t });
    limiter.recordFailure("andraz");
    limiter.recordFailure("andraz");
    expect(run(limiter.middleware, fakeRes())).toBe(false);

    t = 1001;
    expect(run(limiter.middleware, fakeRes())).toBe(true);
  });

  it("okno tece od PRVEGA neuspeha in se z novimi ne podaljsuje", () => {
    let t = 0;
    const limiter = createLoginLimiter({ maxFailures: 2, windowMs: 1000, now: () => t });
    limiter.recordFailure("andraz");
    t = 900;
    limiter.recordFailure("andraz");
    expect(run(limiter.middleware, fakeRes())).toBe(false);

    t = 1001;
    expect(run(limiter.middleware, fakeRes())).toBe(true);
  });

  it("uspesna prijava pobrise stevec", () => {
    const limiter = createLoginLimiter({ maxFailures: 2, windowMs: 60_000 });
    limiter.recordFailure("andraz");
    limiter.recordFailure("andraz");
    limiter.clearFailures("andraz");
    expect(run(limiter.middleware, fakeRes())).toBe(true);
  });

  it("stevec je locen po uporabniku", () => {
    const limiter = createLoginLimiter({ maxFailures: 2, windowMs: 60_000 });
    limiter.recordFailure("andraz");
    limiter.recordFailure("andraz");

    const drugi = fakeRes();
    drugi.locals.valid = { body: { username: "milos", password: "x" } };
    expect(run(limiter.middleware, drugi)).toBe(true);
  });

  it("POST /auth/login po meji neuspehov → 429 pred bazo", async () => {
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) loginLimiter.recordFailure("andraz");

    const res = await request(app)
      .post("/auth/login")
      .send({ username: "andraz", password: "karkoli" });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("too_many_requests");
    expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("neveljavno telo pade na validaciji SE PREJ, tudi ko je racun zaklenjen", async () => {
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) loginLimiter.recordFailure("andraz");

    const res = await request(app).post("/auth/login").send({ username: "andraz" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });
});
