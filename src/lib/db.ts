import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

// One shared database connection for the whole server.
// In development Next.js reloads files when you save them, which would open a
// new connection every time. Keeping it on `globalThis` stops that.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function connect() {
  // The "adapter" is the small library that actually opens the SQLite file.
  const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? connect();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
