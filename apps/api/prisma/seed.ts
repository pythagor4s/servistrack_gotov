import "dotenv/config";
import { prisma } from "../src/db";
import { logger } from "../src/logger";
import { hashPassword } from "../src/auth/password";

async function main() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!username || password.length < 8) {
    throw new Error("V apps/api/.env nastavi ADMIN_USERNAME in ADMIN_PASSWORD (vsaj 8 znakov).");
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    logger.info({ username }, "seed: skrbnik ze obstaja, nic ne spreminjam");
    return;
  }

  await prisma.user.create({
    data: {
      username,
      name: process.env.ADMIN_NAME?.trim() || username,
      role: "ADMIN",
      passwordHash: await hashPassword(password),
    },
  });
  logger.info({ username }, "seed: skrbnik ustvarjen");
}

main()
  .catch((err) => {
    logger.error({ err }, "seed: napaka");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
