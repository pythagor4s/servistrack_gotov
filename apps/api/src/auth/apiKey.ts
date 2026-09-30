import { createHash } from "node:crypto";

export function hashApiKey(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}
