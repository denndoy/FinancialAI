import { PrismaClient } from "@prisma/client";

/**
 * Single PrismaClient instance for serverless (Next.js).
 * Reuse across hot reloads in dev; one connection pool per instance in prod.
 *
 * For DigitalOcean Managed Postgres + PgBouncer, append to DATABASE_URL:
 * ?pgbouncer=true&connection_limit=1
 */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
