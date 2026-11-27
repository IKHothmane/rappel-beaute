import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Lot sécurité B1 — le seed crée un SUPER_ADMIN de démonstration : il doit refuser un environnement
 * déployé et tout mot de passe faible, AVANT la moindre connexion. Aucune base n'est utilisée ici :
 * DATABASE_URL vise un port local fermé, et `dotenv` ne remplace jamais une variable déjà posée.
 */
const ROOT = process.cwd();
const TSX = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const DEAD_DATABASE_URL = "postgresql://seed:seed@127.0.0.1:1/none?schema=public";

function runSeed(overrides: Record<string, string>) {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue;
    if (key.startsWith("RAILWAY_") || key.startsWith("SEED_")) continue;
    if (/DATABASE_URL$|^DATABASE_TEST/.test(key)) continue;
    env[key] = value;
  }
  // Valeurs explicites (même vides) : le .env local ne peut pas les réintroduire.
  Object.assign(
    env,
    {
      DATABASE_URL: DEAD_DATABASE_URL,
      DIRECT_DATABASE_URL: DEAD_DATABASE_URL,
      NODE_ENV: "development",
      APP_ENV: "development",
      SEED_ALLOW_DEMO: "",
      SEED_DEMO_PASSWORD: "",
      RAILWAY_ENVIRONMENT: "",
      RAILWAY_ENVIRONMENT_NAME: "",
      RAILWAY_ENVIRONMENT_ID: "",
    },
    overrides,
  );
  const result = spawnSync(process.execPath, [TSX, "prisma/seed.ts"], {
    cwd: ROOT,
    env,
    encoding: "utf8",
    timeout: 60_000,
  });
  return { status: result.status, output: `${result.stdout}\n${result.stderr}` };
}

describe("prisma/seed.ts — garde d'environnement", () => {
  it.each([
    ["NODE_ENV=production", { NODE_ENV: "production" }],
    ["APP_ENV=staging", { APP_ENV: "staging" }],
    ["APP_ENV=production", { APP_ENV: "Production" }],
    ["RAILWAY_ENVIRONMENT_NAME", { RAILWAY_ENVIRONMENT_NAME: "staging" }],
    ["RAILWAY_ENVIRONMENT_ID", { RAILWAY_ENVIRONMENT_ID: "env-123" }],
  ])("refuse %s sans SEED_ALLOW_DEMO=1", (_label, overrides) => {
    const { status, output } = runSeed(overrides);
    expect(status).toBe(1);
    expect(output).toContain("[seed] Refusé : environnement déployé détecté");
    expect(output).not.toContain("ECONNREFUSED");
  });

  it("SEED_ALLOW_DEMO=1 sur un environnement déployé exige SEED_DEMO_PASSWORD", () => {
    const { status, output } = runSeed({ APP_ENV: "staging", SEED_ALLOW_DEMO: "1" });
    expect(status).toBe(1);
    expect(output).toContain("SEED_DEMO_PASSWORD est obligatoire");
    expect(output).not.toContain("ECONNREFUSED");
  });

  it.each([["demo1234"], ["password123"], ["aaaaaaaaaaaa"]])(
    "refuse le mot de passe faible %s",
    (weak) => {
      const { status, output } = runSeed({ SEED_DEMO_PASSWORD: weak });
      expect(status).toBe(1);
      expect(output).toContain("[seed] SEED_DEMO_PASSWORD refusé");
      expect(output).not.toContain(weak);
      expect(output).not.toContain("ECONNREFUSED");
    },
  );

  it("en local, la garde laisse passer : l'échec vient de la base injoignable, pas du garde", () => {
    const { status, output } = runSeed({});
    expect(status).toBe(1);
    expect(output).not.toContain("[seed] Refusé");
    expect(output).toMatch(/ECONNREFUSED|connect/i);
    // Aucun compte créé : aucun mot de passe ne doit être annoncé.
    expect(output).not.toContain("Mot de passe généré");
  });

  it("SEED_ALLOW_DEMO=1 avec un mot de passe fort passe la garde d'un environnement déployé", () => {
    const { status, output } = runSeed({
      APP_ENV: "staging",
      SEED_ALLOW_DEMO: "1",
      SEED_DEMO_PASSWORD: "Vx9-unit-test-only-Qm2",
    });
    expect(status).toBe(1);
    expect(output).not.toContain("[seed] Refusé");
    expect(output).toMatch(/ECONNREFUSED|connect/i);
  });
});
