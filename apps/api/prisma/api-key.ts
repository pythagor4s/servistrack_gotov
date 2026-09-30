import "dotenv/config";
import { randomBytes } from "node:crypto";
import { prisma } from "../src/db";
import { hashApiKey } from "../src/auth/apiKey";

const out = (line = "") => process.stdout.write(`${line}\n`);

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === "create") {
    if (!arg?.trim()) throw new Error('Usage: apikey create "<label>"');
    const key = `sk_live_${randomBytes(32).toString("base64url")}`;
    const row = await prisma.apiKey.create({ data: { hashedKey: hashApiKey(key), label: arg.trim() } });
    out(`Kljuc "${row.label}" (${row.id}) - shranite ga zdaj, znova ga ni mogoce prebrati:`);
    out();
    out(`  ${key}`);
    out();
    out("DiTrack ga poslje v glavi `x-api-key`.");
  } else if (cmd === "list") {
    const keys = await prisma.apiKey.findMany({ orderBy: { createdAt: "asc" } });
    for (const k of keys) {
      out(`${k.id}  ${k.label}  ustvarjen ${k.createdAt.toISOString()}  zadnja raba ${k.lastUsedAt?.toISOString() ?? "nikoli"}`);
    }
    if (keys.length === 0) out("Ni kljucev.");
  } else if (cmd === "revoke") {
    if (!arg) throw new Error("Usage: apikey revoke <id>");
    const row = await prisma.apiKey.delete({ where: { id: arg } });
    out(`Kljuc "${row.label}" preklican - klici z njim odslej dobijo 401.`);
  } else {
    throw new Error('Usage: apikey create "<label>" | list | revoke <id>');
  }
}

main()
  .catch((err: unknown) => {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
