import { PrismaClient } from "@prisma/client";

/**
 * Single PrismaClient instance for serverless (Next.js).
 * Reuse across hot reloads in dev; one connection pool per instance in prod.
 *
 * For Azure Database for PostgreSQL in serverless deployments,
 * use a pooled DATABASE_URL (PgBouncer-compatible) and keep
 * connection_limit low to avoid exhausting backend connections.
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
