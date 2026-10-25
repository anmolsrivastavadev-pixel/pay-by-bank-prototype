import { PrismaClient } from "@prisma/client";

// One shared database connection for the whole server.
// In development Next.js reloads files when you save them, which would open a
// new connection every time. Keeping it on `globalThis` stops that.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
