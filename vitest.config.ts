import path from "path";
import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  // Transformer le JSX des composants Next pour les tests de rendu serveur.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    globals: true,
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    // .tmp et .test-db : copies de build et fichiers locaux (hors git), à ne pas exécuter comme tests unitaires.
    exclude: ["**/node_modules/**", "**/e2e/**", "**/.next/**", "**/.next-test/**", "**/.tmp/**", "**/.test-db/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./tests/shims/server-only.ts"),
    },
  },
});
