/**
 * Garde-fou : les tests ne se connectent qu'aux services désignés par
 * DATABASE_TEST_URL et REDIS_TEST_URL. Ils écrivent en base (rendez-vous,
 * instituts, clientes) ; DATABASE_URL seul ne suffit donc jamais à les autoriser.
 *
 * - DATABASE_TEST_URL défini  → DATABASE_URL est remplacé par cette valeur.
 * - DATABASE_TEST_URL absent  → DATABASE_URL est retiré : les tests d'intégration
 *   sont ignorés (`process.env.DATABASE_URL ? describe : describe.skip`).
 * - Hôte non local            → refus, sauf ALLOW_REMOTE_TEST_DATABASE=1
 *   (base distante créée exprès pour les tests).
 * - Environnement de production → refus, quelle que soit la configuration.
 * - REDIS_URL suit la même règle avec REDIS_TEST_URL ; sans elle, l'application
 *   utilise son repli mémoire.
 */
type Env = Record<string, string | undefined>;

export type TestDatabaseMode = "configured" | "skipped";

const PRODUCTION_MARKERS = ["RAILWAY_ENVIRONMENT_NAME", "RAILWAY_ENVIRONMENT", "APP_ENV"];
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1", "[::1]"];

function hostOf(url: string, name: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    throw new Error(`[tests] ${name} n'est pas une URL valide.`);
  }
}

function assertLocal(url: string, name: string, env: Env): void {
  if (LOCAL_HOSTS.includes(hostOf(url, name))) return;
  if (env.ALLOW_REMOTE_TEST_DATABASE === "1") return;
  throw new Error(
    `[tests] ${name} pointe sur un hôte distant. Les tests n'utilisent qu'une base locale ; ` +
      "pour une base distante dédiée aux tests, définissez ALLOW_REMOTE_TEST_DATABASE=1.",
  );
}

export function enforceTestDatabase(env: Env = process.env): TestDatabaseMode {
  const marker = PRODUCTION_MARKERS.find(
    (name) => env[name]?.trim().toLowerCase() === "production",
  );
  if (marker || env.NODE_ENV === "production") {
    throw new Error(
      `[tests] Refus de lancer les tests : environnement de production détecté (${marker ?? "NODE_ENV"}).`,
    );
  }

  const testUrl = env.DATABASE_TEST_URL?.trim();
  const directTestUrl = env.DATABASE_TEST_DIRECT_URL?.trim();
  const redisTestUrl = env.REDIS_TEST_URL?.trim();

  // Jamais d'URL héritée du .env applicatif : seuls les services de test sont admis.
  delete env.DATABASE_URL;
  delete env.DIRECT_DATABASE_URL;
  delete env.REDIS_URL;

  if (redisTestUrl) {
    assertLocal(redisTestUrl, "REDIS_TEST_URL", env);
    env.REDIS_URL = redisTestUrl;
  }

  if (!testUrl) return "skipped";

  assertLocal(testUrl, "DATABASE_TEST_URL", env);
  env.DATABASE_URL = testUrl;
  if (directTestUrl) {
    assertLocal(directTestUrl, "DATABASE_TEST_DIRECT_URL", env);
    env.DIRECT_DATABASE_URL = directTestUrl;
  }
  return "configured";
}
