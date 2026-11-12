import { describe, expect, it } from "vitest";
import { enforceTestDatabase } from "../helpers/test-database";

type Env = Record<string, string | undefined>;

const APP_URL = "postgresql://app@prod.example/app";
const TEST_URL = "postgresql://test@127.0.0.1:54329/test";
const REMOTE_TEST_URL = "postgresql://test@tests.example/test";

describe("Garde-fou base de test", () => {
  it("sans DATABASE_TEST_URL : URLs applicatives retirées, tests ignorés", () => {
    const env: Env = {
      DATABASE_URL: APP_URL,
      DIRECT_DATABASE_URL: APP_URL,
      REDIS_URL: "redis://prod.example:6379",
    };
    expect(enforceTestDatabase(env)).toBe("skipped");
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.DIRECT_DATABASE_URL).toBeUndefined();
    expect(env.REDIS_URL).toBeUndefined();
  });

  it("avec DATABASE_TEST_URL : remplace DATABASE_URL", () => {
    const env: Env = {
      DATABASE_URL: APP_URL,
      DIRECT_DATABASE_URL: APP_URL,
      DATABASE_TEST_URL: TEST_URL,
    };
    expect(enforceTestDatabase(env)).toBe("configured");
    expect(env.DATABASE_URL).toBe(TEST_URL);
    expect(env.DIRECT_DATABASE_URL).toBeUndefined();
  });

  it("DATABASE_TEST_DIRECT_URL alimente DIRECT_DATABASE_URL", () => {
    const env: Env = {
      DATABASE_TEST_URL: TEST_URL,
      DATABASE_TEST_DIRECT_URL: `${TEST_URL}?direct`,
    };
    enforceTestDatabase(env);
    expect(env.DIRECT_DATABASE_URL).toBe(`${TEST_URL}?direct`);
  });

  it("REDIS_TEST_URL remplace REDIS_URL", () => {
    const env: Env = {
      REDIS_URL: "redis://prod.example:6379",
      REDIS_TEST_URL: "redis://127.0.0.1:6380",
    };
    enforceTestDatabase(env);
    expect(env.REDIS_URL).toBe("redis://127.0.0.1:6380");
  });

  it("refuse une base distante sans autorisation explicite", () => {
    expect(() => enforceTestDatabase({ DATABASE_TEST_URL: REMOTE_TEST_URL })).toThrow(/distant/);
    expect(() => enforceTestDatabase({ REDIS_TEST_URL: "redis://cache.example:6379" })).toThrow(
      /distant/,
    );
  });

  it("accepte une base distante avec ALLOW_REMOTE_TEST_DATABASE=1", () => {
    const env: Env = { DATABASE_TEST_URL: REMOTE_TEST_URL, ALLOW_REMOTE_TEST_DATABASE: "1" };
    expect(enforceTestDatabase(env)).toBe("configured");
    expect(env.DATABASE_URL).toBe(REMOTE_TEST_URL);
  });

  it.each(["RAILWAY_ENVIRONMENT_NAME", "RAILWAY_ENVIRONMENT", "APP_ENV", "NODE_ENV"])(
    "refuse en production (%s)",
    (name) => {
      const env: Env = { DATABASE_TEST_URL: TEST_URL, [name]: "production" };
      expect(() => enforceTestDatabase(env)).toThrow(/production/);
    },
  );
});
