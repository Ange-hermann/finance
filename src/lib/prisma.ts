import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    max: process.env.NODE_ENV === "production" ? 1 : 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });
  client.$connect().catch((e) => console.error("[Prisma] Connection error:", e));
  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
