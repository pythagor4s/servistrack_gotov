import "dotenv/config";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@servis-track/shared";

const secretString = process.env.JWT_SECRET;
if (!secretString) {
  throw new Error(
    "JWT_SECRET is not set. Copy apps/api/.env.example to apps/api/.env and set it.",
  );
}
const secret = new TextEncoder().encode(secretString);

const ALG = "HS256";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type SessionClaims = { sub: string; role: Role };

export function signSession(claims: SessionClaims): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ role: claims.role })
    .setProtectedHeader({ alg: ALG })
    .setSubject(claims.sub)
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_TTL_SECONDS)
    .sign(secret);
}

export async function verifySession(token: string): Promise<SessionClaims> {
  const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] });
  const { sub, role } = payload;
  if (typeof sub !== "string" || (role !== "ADMIN" && role !== "TECHNICIAN")) {
    throw new Error("Invalid session claims");
  }
  return { sub, role };
}
