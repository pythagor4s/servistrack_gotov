import type { CookieOptions } from "express";
import { SESSION_TTL_SECONDS } from "./jwt";

export const SESSION_COOKIE = "st_session";

export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS * 1000,
  };
}
