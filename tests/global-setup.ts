import dotenv from "dotenv";
import { enforceTestDatabase } from "./helpers/test-database";
import { ensureTestDatabase } from "./db/test-db.mjs";

/**
 * Avant les tests : applique le garde-fou, puis démarre la base locale dédiée
 * si DATABASE_TEST_URL la désigne et qu'elle ne tourne pas déjà.
 */
export default async function globalSetup(): Promise<(() => Promise<void>) | void> {
  dotenv.config({ quiet: true });
  if (enforceTestDatabase() === "skipped") return;
  if (process.env.CI) return; // la CI fournit ses propres services

  const stop = await ensureTestDatabase(process.env.DATABASE_URL as string);
  return stop ?? undefined;
}
