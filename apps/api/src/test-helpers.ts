import type { Role } from "@servis-track/shared";
import { signSession } from "./auth/jwt";
import { SESSION_COOKIE } from "./auth/session";

export async function sessionCookie(
  opts: { id?: string; role?: Role } = {},
): Promise<string> {
  const token = await signSession({
    sub: opts.id ?? "usr_test",
    role: opts.role ?? "TECHNICIAN",
  });
  return `${SESSION_COOKIE}=${token}`;
}
