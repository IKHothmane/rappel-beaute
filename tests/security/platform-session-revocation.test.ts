import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { getSessionSecret, hashPassword, signJwt, verifyJwt } from "@/lib/auth/crypto";

/**
 * Sessions plateforme révocables : sessionVersion dans le jeton, relue dans la requête d'état,
 * incrémentée au changement de mot de passe / à la désactivation / à la réinitialisation.
 * Aucune base : le pool est simulé, chaque requête SQL est enregistrée.
 */
type Reply = { rows: unknown[]; rowCount?: number };
const db = vi.hoisted(() => ({
  calls: [] as Array<{ sql: string; params: unknown[]; via: "pool" | "client" }>,
  responders: [] as Array<{ match: RegExp; reply: (params: unknown[]) => Reply }>,
  audit: vi.fn(),
}));

function answer(sql: string, params: unknown[]): Reply {
  const hit = db.responders.find((r) => r.match.test(sql));
  return hit ? hit.reply(params) : { rows: [], rowCount: 1 };
}

vi.mock("@/lib/db/pool", () => {
  const client = {
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      db.calls.push({ sql, params, via: "client" });
      return answer(sql, params);
    }),
    release: vi.fn(),
  };
  return {
    pool: {
      query: vi.fn(async (sql: string, params: unknown[] = []) => {
        db.calls.push({ sql, params, via: "pool" });
        return answer(sql, params);
      }),
      connect: vi.fn(async () => client),
    },
  };
});
vi.mock("@/lib/db/platform-audit", () => ({ writePlatformAuditLog: db.audit }));
vi.mock("@/lib/db/users", () => ({ getUserSessionState: vi.fn(), authenticateUser: vi.fn() }));
vi.mock("@/lib/db/tenant-context", () => ({ bindOrganization: vi.fn() }));

import { requirePlatformSession } from "@/lib/auth/api-guard";
import { createSessionCookie, parseSessionToken } from "@/lib/auth/session";
import { PLATFORM_SESSION_MAX_AGE_SEC, SESSION_MAX_AGE_SEC, type PlatformSessionUser } from "@/lib/auth/types";
import {
  authenticatePlatformUser,
  changePlatformUserPassword,
  getPlatformUserById,
  resetPlatformUserPassword,
  setPlatformUserStatus,
} from "@/lib/db/platform-users";

const sqlOf = (sql: string) => sql.replace(/\s+/g, " ").trim();
const clientSql = () => db.calls.filter((c) => c.via === "client").map((c) => sqlOf(c.sql));

const platformUser = (over: Partial<PlatformSessionUser> = {}): PlatformSessionUser => ({
  id: "pu_1", email: "a@t.test", firstName: "A", lastName: "Admin", role: "SUPER_ADMIN",
  scope: "platform", accountType: "PLATFORM", sessionVersion: 0, ...over,
});
const actor = platformUser({ id: "pu_actor" });

function requestWith(token: string): NextRequest {
  return {
    cookies: { get: (name: string) => (name === "rappel_session" ? { value: token } : undefined) },
    nextUrl: { pathname: "/api/admin/x" },
  } as unknown as NextRequest;
}
const tokenFor = (extra: Record<string, unknown> = {}) =>
  signJwt(
    { id: "pu_1", email: "a@t.test", firstName: "A", lastName: "Admin", role: "SUPER_ADMIN", scope: "platform", accountType: "PLATFORM", ...extra },
    getSessionSecret(),
    3600,
  );

/** Répond à la lecture d'état faite par requirePlatformSession (getPlatformUserById). */
function dbState(row: Record<string, unknown> | null) {
  db.responders.push({
    match: /FROM "PlatformUser" WHERE id = \$1 LIMIT 1/,
    reply: () => ({
      rows: row
        ? [{ id: "pu_1", email: "a@t.test", firstName: "A", lastName: "Admin", role: "SUPER_ADMIN", status: "ACTIVE", passwordHash: null, ...row }]
        : [],
    }),
  });
}

beforeEach(() => {
  db.calls = [];
  db.responders = [];
  db.audit.mockReset();
  db.audit.mockResolvedValue(undefined);
});

describe("requirePlatformSession et sessionVersion", () => {
  it("accepte un jeton dont la version correspond à la base, avec une seule requête d'état", async () => {
    dbState({ sessionVersion: 3 });
    const auth = await requirePlatformSession(requestWith(tokenFor({ sessionVersion: 3 })));
    expect(auth.ok).toBe(true);
    expect(db.calls).toHaveLength(1);
  });

  it("révoque un jeton émis avant l'incrément (changement de mot de passe, désactivation)", async () => {
    dbState({ sessionVersion: 4 });
    const auth = await requirePlatformSession(requestWith(tokenFor({ sessionVersion: 3 })));
    expect(auth.ok).toBe(false);
    if (!auth.ok) {
      expect(auth.response.status).toBe(401);
      expect((await auth.response.json()).code).toBe("SESSION_REVOKED");
    }
  });

  it("accepte un ancien jeton sans version tant que la base est à 0, puis le révoque", async () => {
    dbState({ sessionVersion: 0 });
    expect((await requirePlatformSession(requestWith(tokenFor()))).ok).toBe(true);

    db.responders = [];
    dbState({ sessionVersion: 1 });
    expect((await requirePlatformSession(requestWith(tokenFor()))).ok).toBe(false);
  });

  it("refuse toujours un administrateur désactivé, quelle que soit la version", async () => {
    dbState({ status: "DISABLED", sessionVersion: 0 });
    const auth = await requirePlatformSession(requestWith(tokenFor({ sessionVersion: 0 })));
    expect(auth.ok).toBe(false);
  });
});

describe("jeton et durée de session plateforme", () => {
  it("un ancien jeton est lu avec la version 0 puis ré-émis avec une version explicite", () => {
    const legacy = parseSessionToken(tokenFor());
    expect(legacy?.scope).toBe("platform");
    expect((legacy as PlatformSessionUser).sessionVersion).toBe(0);
    const cookie = createSessionCookie(legacy!);
    const payload = verifyJwt<Record<string, unknown>>(cookie.value, getSessionSecret());
    expect(payload?.sessionVersion).toBe(0);
  });

  it("limite la session plateforme à 7 jours, même si l'appelant demande 30 jours", () => {
    expect(PLATFORM_SESSION_MAX_AGE_SEC).toBe(7 * 24 * 3600);
    const cookie = createSessionCookie(platformUser({ sessionVersion: 2 }), SESSION_MAX_AGE_SEC);
    expect(cookie.maxAge).toBe(PLATFORM_SESSION_MAX_AGE_SEC);
    const payload = verifyJwt<{ exp: number; iat: number; sessionVersion: number }>(cookie.value, getSessionSecret());
    expect(payload!.exp - payload!.iat).toBe(PLATFORM_SESSION_MAX_AGE_SEC);
    expect(payload?.sessionVersion).toBe(2);
  });

  it("garde 30 jours pour un institut et un cookie de navigateur (sans maxAge) pour remember=false", () => {
    const app = {
      id: "u", email: "u@t.test", firstName: "U", lastName: "U", role: "OWNER", organizationId: "o", orgName: "O",
      orgSlug: "o", orgLogoUrl: null, scope: "app", accountType: "ORGANIZATION", mustChangePassword: false, sessionVersion: 0,
    } as const;
    expect(createSessionCookie(app).maxAge).toBe(SESSION_MAX_AGE_SEC);
    expect("maxAge" in createSessionCookie(platformUser(), null)).toBe(false);
  });
});

describe("authenticatePlatformUser et getPlatformUserById", () => {
  it("renvoient la sessionVersion lue en base (0 si NULL)", async () => {
    db.responders.push({
      match: /FROM "PlatformUser"/,
      reply: () => ({
        rows: [{ id: "pu_1", email: "a@t.test", firstName: "A", lastName: "B", role: "SUPER_ADMIN", status: "ACTIVE", passwordHash: hashPassword("secret-pass-1"), sessionVersion: 5 }],
      }),
    });
    expect((await authenticatePlatformUser("A@t.test", "secret-pass-1"))?.sessionVersion).toBe(5);
    expect(await authenticatePlatformUser("a@t.test", "wrong")).toBeNull();
    db.responders = [{
      match: /FROM "PlatformUser"/,
      reply: () => ({
        rows: [{ id: "pu_1", email: "a@t.test", firstName: "A", lastName: "B", role: "SUPER_ADMIN", status: "ACTIVE", passwordHash: null, sessionVersion: null }],
      }),
    }];
    expect((await getPlatformUserById("pu_1"))?.sessionVersion).toBe(0);
  });
});

describe("changePlatformUserPassword", () => {
  function lockedRow(status = "ACTIVE") {
    db.responders.push({
      match: /SELECT "passwordHash", status FROM "PlatformUser" WHERE id = \$1 FOR UPDATE/,
      reply: () => ({ rows: [{ passwordHash: hashPassword("old-password"), status }] }),
    });
    db.responders.push({
      match: /UPDATE "PlatformUser"[\s\S]*RETURNING "sessionVersion"/,
      reply: () => ({ rows: [{ sessionVersion: 7 }] }),
    });
  }
  const input = { id: "pu_1", currentPassword: "old-password", newPassword: "new-password-1", platformUserName: "A Admin" };

  it("verrouille la ligne, incrémente la version et audite dans la même transaction", async () => {
    lockedRow();
    await expect(changePlatformUserPassword(input)).resolves.toEqual({ sessionVersion: 7 });
    const sql = clientSql();
    expect(sql[0]).toBe("BEGIN");
    expect(sql[1]).toContain("FOR UPDATE");
    expect(sql.find((s) => s.startsWith('UPDATE "PlatformUser"'))).toContain('"sessionVersion" = "sessionVersion" + 1');
    expect(sql.at(-1)).toBe("COMMIT");
    expect(db.calls.every((c) => c.via === "client")).toBe(true);
    expect(db.audit).toHaveBeenCalledWith(expect.objectContaining({ client: expect.anything(), entityType: "PlatformUser", entityId: "pu_1" }));
  });

  it("annule le changement si l'audit échoue (tout ou rien)", async () => {
    lockedRow();
    db.audit.mockRejectedValue(new Error("audit down"));
    await expect(changePlatformUserPassword(input)).rejects.toThrow("audit down");
    expect(clientSql().at(-1)).toBe("ROLLBACK");
    expect(clientSql()).not.toContain("COMMIT");
  });

  it("refuse un mauvais mot de passe actuel sans rien écrire", async () => {
    lockedRow();
    await expect(changePlatformUserPassword({ ...input, currentPassword: "nope-nope" })).rejects.toThrow("BAD_PASSWORD");
    expect(clientSql().some((s) => s.startsWith('UPDATE "PlatformUser"'))).toBe(false);
    expect(db.audit).not.toHaveBeenCalled();
  });

  it("refuse un compte désactivé et valide la longueur avant toute requête", async () => {
    lockedRow("DISABLED");
    await expect(changePlatformUserPassword(input)).rejects.toThrow("NOT_FOUND");
    db.calls = [];
    await expect(changePlatformUserPassword({ ...input, newPassword: "short" })).rejects.toThrow("WEAK_PASSWORD");
    await expect(changePlatformUserPassword({ ...input, newPassword: "x".repeat(201) })).rejects.toThrow("PASSWORD_TOO_LONG");
    expect(db.calls).toHaveLength(0);
  });
});

describe("setPlatformUserStatus et resetPlatformUserPassword", () => {
  function user(status: string, others: number) {
    db.responders.push({
      match: /SELECT status, email FROM "PlatformUser" WHERE id = \$1 FOR UPDATE/,
      reply: () => ({ rows: [{ status, email: "x@t.test" }] }),
    });
    db.responders.push({
      match: /COUNT\(\*\)::text AS n FROM "PlatformUser"/,
      reply: () => ({ rows: [{ n: String(others) }] }),
    });
  }

  it("la désactivation révoque les sessions (version + 1) avec l'audit, atomiquement", async () => {
    user("ACTIVE", 1);
    await setPlatformUserStatus(actor, "pu_2", "DISABLED");
    const update = clientSql().find((s) => s.startsWith('UPDATE "PlatformUser"'))!;
    expect(update).toContain(`"sessionVersion" = "sessionVersion" + CASE WHEN $2::text = 'DISABLED' THEN 1 ELSE 0 END`);
    expect(clientSql().at(-1)).toBe("COMMIT");
    expect(db.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "PLATFORM_USER_DISABLED", client: expect.anything() }));
  });

  it("refuse de désactiver le dernier administrateur actif", async () => {
    user("ACTIVE", 0);
    await expect(setPlatformUserStatus(actor, "pu_2", "DISABLED")).rejects.toThrow("LAST_ADMIN");
    expect(clientSql().at(-1)).toBe("ROLLBACK");
    expect(db.audit).not.toHaveBeenCalled();
  });

  it("est idempotent : un statut déjà appliqué n'écrit ni version ni audit", async () => {
    user("DISABLED", 3);
    await setPlatformUserStatus(actor, "pu_2", "DISABLED");
    expect(clientSql().some((s) => s.startsWith('UPDATE "PlatformUser"'))).toBe(false);
    expect(db.audit).not.toHaveBeenCalled();
  });

  it("la réinitialisation change le hash, incrémente la version et audite ensemble", async () => {
    user("ACTIVE", 2);
    await resetPlatformUserPassword(actor, "pu_2", "temporary-pass-1");
    const update = db.calls.find((c) => sqlOf(c.sql).startsWith('UPDATE "PlatformUser"'))!;
    expect(sqlOf(update.sql)).toContain('"sessionVersion" = "sessionVersion" + 1');
    expect(update.params[1]).not.toBe("temporary-pass-1");
    expect(db.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "PLATFORM_USER_PASSWORD_RESET", client: expect.anything() }));
    await expect(resetPlatformUserPassword(actor, "pu_2", "short")).rejects.toThrow("WEAK_PASSWORD");
  });

  it("refuse la réinitialisation d'un compte désactivé", async () => {
    user("DISABLED", 2);
    await expect(resetPlatformUserPassword(actor, "pu_2", "temporary-pass-1")).rejects.toThrow("USER_DISABLED");
    expect(db.audit).not.toHaveBeenCalled();
  });
});
