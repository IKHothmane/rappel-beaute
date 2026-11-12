import "../dev-preload.cjs";
import dotenv from "dotenv";
import { enforceTestDatabase } from "./helpers/test-database";

dotenv.config();

if (enforceTestDatabase() === "skipped") {
  console.warn(
    "[tests] DATABASE_TEST_URL absent — les tests d'intégration sont ignorés. " +
      "Définissez DATABASE_TEST_URL sur une base de test (jamais la production).",
  );
}
