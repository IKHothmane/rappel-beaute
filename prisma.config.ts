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
    // Les migrations ont besoin du rôle propriétaire ; l'application peut utiliser un rôle limité (docs/rls-activation.md).
    url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || BUILD_PLACEHOLDER_DATABASE_URL,
  },
});
