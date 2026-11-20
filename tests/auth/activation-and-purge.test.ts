import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { currentScope } from "@/lib/db/tenant-context";

/**
 * Jetons de réinitialisation (un nouveau jeton invalide les précédents, atomiquement) et purge planifiée de l'état
 * d'authentification (route cron, portée job, aucune suppression de compte). Sans base.
 */
const db = vi.hoisted(() => ({
  calls: [] as Array<{ sql: string; params: unknown[]; via: "pool" | "client"; scope?: string }>,
  responders: [] as Array<{ match: RegExp; reply: (params: unknown[]) => unknown }>,
  released: 0,
}));

vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/db/audit", () => ({ writeAuditLog: vi.fn() }));
vi.mock("@/lib/db/pool", () => {
  const answer = (sql: string, params: unknown[]) => {
    const hit = db.responders.find((r) => r.match.test(sql));
    if (!hit) return { rows: [], rowCount: 1 };
    const reply = hit.reply(params);
    return reply;
  };
  const client = {
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      db.calls.push({ sql: sql.replace(/\s+/g, " ").trim(), params, via: "client" });
      return answer(sql, params);
    }),
    release: vi.fn(() => {
      db.released += 1;
    }),
  };
  return {
    pool: {
      query: vi.fn(async (sql: string, params: unknown[] = []) => {
        db.calls.push({ sql: sql.replace(/\s+/g, " ").trim(), params, via: "pool", scope: currentScopeKind() });
        return answer(sql, params);
      }),
      connect: vi.fn(async () => client),
    },
  };
  function currentScopeKind() {
    return (globalThis as { __rappelTenantScope?: { getStore(): { kind: string } | undefined } }).__rappelTenantScope?.getStore()?.kind;
  }
});

import { hashActivationToken, issuePasswordResetToken } from "@/lib/db/activation";
import { purgeExpiredAuthState } from "@/lib/db/auth-purge";
import { GET, POST } from "@/app/api/cron/auth-purge/route";

const sql = () => db.calls.filter((c) => c.via === "client").map((c) => c.sql);

beforeEach(() => {
  db.calls = [];
  db.responders = [];
  db.released = 0;
  vi.stubEnv("CRON_SECRET", "cron-secret-of-sufficient-length");
});

describe("issuePasswordResetToken : un nouveau jeton invalide les précédents", () => {
  const userFound = () =>
    db.responders.push({ match: /SELECT id FROM "User"/, reply: () => ({ rows: [{ id: "u_1" }] }) });

  it("verrouille le compte, consomme les jetons ouverts puis insère le nouveau, dans une seule transaction", async () => {
    userFound();
    const token = await issuePasswordResetToken("U@T.test ");
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    const statements = sql();
    expect(statements[0]).toBe("BEGIN");
    expect(statements[1]).toMatch(/SELECT id FROM "User" WHERE LOWER\(BTRIM\(email\)\) = \$1 AND status = 'ACTIVE' LIMIT 2 FOR UPDATE/);
    expect(statements[2]).toBe(`UPDATE "ActivationToken" SET "usedAt" = NOW() WHERE "userId" = $1 AND "usedAt" IS NULL`);
    expect(statements[3]).toMatch(/^INSERT INTO "ActivationToken"/);
    expect(statements[4]).toBe("COMMIT");
    expect(db.calls.filter((c) => c.via === "pool")).toHaveLength(0);
    const insert = db.calls.find((c) => c.sql.startsWith('INSERT INTO "ActivationToken"'))!;
    expect(insert.params[2]).toBe(hashActivationToken(token!)); // seul le haché est stocké
    expect(insert.params[2]).not.toBe(token);
    expect(db.calls.find((c) => c.sql.includes("FOR UPDATE"))!.params).toEqual(["u@t.test"]);
    expect(db.released).toBe(1);
  });

  it("compte inconnu ou inactif : aucune écriture, transaction annulée, connexion rendue", async () => {
    expect(await issuePasswordResetToken("inconnu@t.test")).toBeNull();
    const statements = sql();
    expect(statements).toEqual([
      "BEGIN",
      expect.stringContaining('SELECT id FROM "User"'),
      "ROLLBACK",
    ]);
    expect(db.released).toBe(1);
  });

  it("échec de l'insertion : tout est annulé (les anciens jetons ne sont pas consommés pour rien)", async () => {
    userFound();
    db.responders.unshift({
      match: /^\s*INSERT INTO "ActivationToken"/,
      reply: () => {
        throw new Error("insert failed");
      },
    });
    await expect(issuePasswordResetToken("u@t.test")).rejects.toThrow("insert failed");
    expect(sql().at(-1)).toBe("ROLLBACK");
    expect(sql()).not.toContain("COMMIT");
    expect(db.released).toBe(1);
  });
});

describe("purge planifiée de l'état d'authentification", () => {
  const request = (headers: Record<string, string> = {}, query = "") =>
    new NextRequest(`http://localhost/api/cron/auth-purge/${query}`, { method: "POST", headers });
  const authorized = { authorization: "Bearer cron-secret-of-sufficient-length" };
  const counts = {
    oauthStates: "3", pendingSignups: "1", verificationTokens: "0",
    sessionRevocations: "12", activationTokensDeleted: "4", activationTokensHashed: "2",
  };

  it("sans secret valide : 404, aucun accès base", async () => {
    for (const handler of [GET, POST]) {
      expect((await handler(request())).status).toBe(404);
      expect((await handler(request({ authorization: "Bearer mauvais-secret-de-longueur-ok" }))).status).toBe(404);
    }
    vi.stubEnv("CRON_SECRET", "court");
    expect((await POST(request({ authorization: "Bearer court" }))).status).toBe(404);
    expect(db.calls).toHaveLength(0);
  });

  it("dryRun : ne touche pas la base", async () => {
    const res = await POST(request(authorized, "?dryRun=1"));
    expect(await res.json()).toEqual({ ok: true, dryRun: true });
    expect(db.calls).toHaveLength(0);
  });

  it("appelle app_purge_expired_auth_data sous la portée « job » et renvoie les compteurs", async () => {
    db.responders.push({ match: /app_purge_expired_auth_data/, reply: () => ({ rows: [counts] }) });
    const res = await POST(request(authorized));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true, oauthStates: 3, pendingSignups: 1, verificationTokens: 0,
      sessionRevocations: 12, activationTokensDeleted: 4, activationTokensHashed: 2,
    });
    const call = db.calls.find((c) => c.sql.includes("app_purge_expired_auth_data"))!;
    expect(call.scope).toBe("job");
    expect(call.params).toEqual([7]);
    // Aucune suppression directe de compte ou d'institut depuis l'application
    expect(db.calls.some((c) => /DELETE\s+FROM\s+"(User|Organization)"/i.test(c.sql))).toBe(false);
  });

  it("purgeExpiredAuthState borne le délai de grâce (0 à 365 jours, sinon 7)", async () => {
    db.responders.push({ match: /app_purge_expired_auth_data/, reply: () => ({ rows: [counts] }) });
    await purgeExpiredAuthState(30);
    await purgeExpiredAuthState(-1);
    await purgeExpiredAuthState(10_000);
    expect(db.calls.map((c) => c.params[0])).toEqual([30, 7, 7]);
    expect(currentScope()).toBeUndefined();
  });

  it("erreur de base : 500 générique, sans détail", async () => {
    db.responders.push({
      match: /app_purge_expired_auth_data/,
      reply: () => {
        throw new Error("function does not exist");
      },
    });
    const res = await POST(request(authorized));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Purge impossible." });
  });
});

describe("migration 20261120100000_auth_session_revocation (contrôle statique)", () => {
  const migration = fs.readFileSync(
    path.join(process.cwd(), "prisma/migrations/20261120100000_auth_session_revocation/migration.sql"),
    "utf8",
  );
  const code = migration.replace(/^--.*$/gm, "");

  it("additive : aucune suppression ni modification de l'existant", () => {
    expect(code).not.toMatch(/DROP\s+(TABLE|COLUMN|INDEX|FUNCTION)/i);
    expect(code).not.toMatch(/ALTER\s+TABLE\s+(?!"SessionRevocation")/i);
    expect(code).not.toMatch(/ALTER\s+TABLE\s+"SessionRevocation"\s+DROP/i);
    expect(code).not.toMatch(/DELETE\s+FROM\s+public\."(User|Organization|PlatformUser)"/i);
  });

  it("RLS activée, droits limités (aucun UPDATE/DELETE pour les rôles applicatifs), purge réservée à job et plateforme", () => {
    expect(code).toMatch(/ALTER TABLE "SessionRevocation" ENABLE ROW LEVEL SECURITY/);
    expect(code).toMatch(/REVOKE ALL ON TABLE "SessionRevocation" FROM PUBLIC, rappel_app, rappel_platform, rappel_public, rappel_job/);
    expect(code).not.toMatch(/GRANT[^;]*\b(UPDATE|DELETE)\b[^;]*"SessionRevocation"/);
    expect(code).toMatch(/GRANT EXECUTE ON FUNCTION app_purge_expired_auth_data\(interval\) TO rappel_job, rappel_platform/);
    expect(code).toMatch(/REVOKE ALL ON FUNCTION app_purge_expired_auth_data\(interval\) FROM PUBLIC/);
    expect(code).toMatch(/SECURITY DEFINER\s+SET search_path = pg_catalog/);
  });

  it("le haché SQL des anciens jetons suit hashActivationToken ('sha256:' + SHA-256 hexadécimal de l'UTF-8)", () => {
    expect(code).toContain(`'sha256:' || pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to("token", 'UTF8')), 'hex')`);
    expect(code).toContain(`WHERE "token" NOT LIKE 'sha256:%'`);
  });
});
