import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.warn(
    "[tests] DATABASE_URL absent — les tests d'intégration seront ignorés. Lancez : npm run db:seed",
  );
}
