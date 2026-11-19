import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Key point: Prisma CLI uses this URL, must point to direct connection 5432
    url: env("DIRECT_URL"),
  },
});