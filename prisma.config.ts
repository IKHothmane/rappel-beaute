import "dotenv/config";
import { defineConfig } from "prisma/config";

/** `prisma generate` n'ouvre pas de connexion — placeholder si DATABASE_URL absent au build. */
const BUILD_PLACEHOLDER_DATABASE_URL =
  "postgresql://build:build@127.0.0.1:5432/build?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? BUILD_PLACEHOLDER_DATABASE_URL,
  },
});
