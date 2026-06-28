#!/usr/bin/env node
/**
 * Preflight: Postgres reachable via DATABASE_URL (optional for CI).
 * Exit 0 when unset (local unit-test only); exit 1 on connection failure.
 */

const url = process.env.DATABASE_URL;

if (!url) {
  console.log("verify:db — DATABASE_URL unset, skipping");
  process.exit(0);
}

let PrismaClient;
try {
  const pkg = await import("@prisma/client");
  PrismaClient = pkg.PrismaClient ?? pkg.default?.PrismaClient;
} catch {
  console.error("verify:db FAILED — run npm run db:generate");
  process.exit(1);
}

if (!PrismaClient) {
  console.error("verify:db FAILED — run npm run db:generate");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  await prisma.$queryRaw`SELECT 1`;
  const aliasCount = await prisma.identityAlias.count();
  console.log(`verify:db OK — identity aliases: ${aliasCount}`);
  process.exit(0);
} catch (err) {
  console.error("verify:db FAILED", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
