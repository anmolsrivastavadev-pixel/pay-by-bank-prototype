import { defineConfig } from "prisma/config";

// Settings for the Prisma command-line tool (e.g. `npm run db:setup`).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // A single file on disk. No database server to install.
  datasource: { url: "file:./prisma/dev.db" },
});
