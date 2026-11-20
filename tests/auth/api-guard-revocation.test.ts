import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { signJwt } from "@/lib/auth/crypto";
import { getSessionSecret } from "@/lib/auth/env";

/**
 * Révocation de session dans requireAppSession / requirePlatformSession, et module session-revocation
 * (cache court, idempotence, usage unique, table absente tolérée). Aucune base réelle.
 */
const m = vi.hoisted(() => ({
  userState: null as null | Record<string, unknown>,
  platformUser: null as null | Record<string, unknown>,
  rows: [] as unknown[],
  queryError: null as null | { code: string },
  queries: [] as Array<{ sql: string; params: unknown[] }>,
  rowCount: 1,
}));

vi.mock("@/lib/db/users", () => ({ getUserSessionState: vi.fn(async () => m.userState) }));
vi.mock("@/lib/db/platform-users", () => ({ getPlatformUserById: vi.fn(async () => m.platformUser) }));
vi.mock("@/lib/db/pool", () => ({
  pool: {
    query: vi.fn(async (sql: string, params: unknown[]) => {
      m.queries.push({ sql, params });
      if (m.queryError) throw Object.assign(new Error("boom"), m.queryError);
      return { rows: m.rows, rowCount: m.rowCount };
    }),
  },
}));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { requireAppSession, requirePlatformSession } from "@/lib/auth/api-guard";
import {
  clearSessionRevocationCache,
  consumeOneTimeToken,
  isSessionRevoked,
  revokeSession,
} from "@/lib/db/session-revocation";

const JTI = "0123456789abcdef0123456789abcdef";
const requestWith = (token: string) =>
  ({
    cookies: { get: (name: string) => (name === "rappel_session" ? { value: token } : undefined) },
    nextUrl: { pathname: "/api/test" },
  }) as unknown as NextRequest;

const appToken = (extra: Record<string, unknown> = {}) =>
  signJwt(
    {
      id: "u_1", email: "u@t.test", firstName: "U", lastName: "U", role: "OWNER", organizationId: "org_a", orgName: "A",
      orgSlug: "a", scope: "app", accountType: "ORGANIZATION", mustChangePassword: false, sessionVersion: 0, ...extra,
    },
    getSessionSecret(),
    3600,
  );
const platformToken = (extra: Record<string, unknown> = {}) =>
  signJwt(
    { id: "pu_1", email: "a@t.test", firstName: "A", lastName: "A", role: "SUPER_ADMIN", scope: "platform", accountType: "PLATFORM", ...extra },
    getSessionSecret(),
    3600,
  );

beforeEach(() => {
  m.userState = { status: "ACTIVE", mustChangePassword: false, sessionVersion: 0, role: "OWNER", orgStatus: "ACTIVE" };
  m.platformUser = { id: "pu_1", role: "SUPER_ADMIN", scope: "platform", accountType: "PLATFORM", sessionVersion: 0 };
  m.rows = [];
  m.queryError = null;
  m.queries = [];
  m.rowCount = 1;
  clearSessionRevocationCache();
});

describe("requireAppSession : session déconnectée", () => {
  it("jti révoqué : 401 SESSION_REVOKED, même si le jeton est valide et l'utilisateur actif", async () => {
    m.rows = [{ "?column?": 1 }];
    const auth = await requireAppSession(requestWith(appToken({ jti: JTI })));
    expect(auth.ok).toBe(false);
    if (!auth.ok) {
      expect(auth.response.status).toBe(401);
      expect(await auth.response.json()).toMatchObject({ code: "SESSION_REVOKED" });
    }
  });

  it("jti non révoqué : accès normal ; le rôle reste celui de la base", async () => {
    m.userState = { ...m.userState!, role: "STAFF" };
    const auth = await requireAppSession(requestWith(appToken({ jti: JTI })));
    expect(auth.ok).toBe(true);
    if (auth.ok) expect(auth.session.role).toBe("STAFF");
  });

  it("ancien jeton sans jti : aucun accès à la table de révocation", async () => {
    const auth = await requireAppSession(requestWith(appToken()));
    expect(auth.ok).toBe(true);
    expect(m.queries).toHaveLength(0);
  });

  it("table absente (migration pas encore appliquée) : personne n'est verrouillé", async () => {
    m.queryError = { code: "42P01" };
    const auth = await requireAppSession(requestWith(appToken({ jti: JTI })));
    expect(auth.ok).toBe(true);
  });

  it("toute autre erreur de base remonte (pas de contournement silencieux)", async () => {
    m.queryError = { code: "08006" };
    await expect(requireAppSession(requestWith(appToken({ jti: JTI })))).rejects.toThrow();
  });

  it("sessionVersion dépassée reste refusée même sans révocation", async () => {
    m.userState = { ...m.userState!, sessionVersion: 3 };
    const auth = await requireAppSession(requestWith(appToken({ jti: JTI })));
    expect(auth.ok).toBe(false);
  });
});

describe("requirePlatformSession : session déconnectée", () => {
  it("jti révoqué : 401 ; sinon accès, et la session garde son jti pour les ré-émissions de cookie", async () => {
    m.rows = [{ "?column?": 1 }];
    const denied = await requirePlatformSession(requestWith(platformToken({ jti: JTI })));
    expect(denied.ok).toBe(false);

    clearSessionRevocationCache();
    m.rows = [];
    const authAt = Math.floor(Date.now() / 1000) - 100;
    const allowed = await requirePlatformSession(requestWith(platformToken({ jti: JTI, authAt })));
    expect(allowed.ok).toBe(true);
    if (allowed.ok) expect(allowed.session).toMatchObject({ jti: JTI, authAt, role: "SUPER_ADMIN" });
  });
});

describe("module session-revocation", () => {
  it("met en cache « non révoquée » quelques secondes (une seule requête), « révoquée » définitivement", async () => {
    await isSessionRevoked(JTI);
    await isSessionRevoked(JTI);
    expect(m.queries).toHaveLength(1);
    expect(m.queries[0].sql).toContain(`kind = 'session'`);

    await revokeSession({ jti: JTI, userId: "u_1", organizationId: "org_a", scope: "app", expiresAt: new Date(Date.now() + 1000) });
    expect(await isSessionRevoked(JTI)).toBe(true); // immédiat sur cette instance
    expect(m.queries).toHaveLength(2); // le cache n'a pas relancé de requête de lecture
  });

  it("revokeSession : insertion idempotente avec expiration, sans écraser une révocation existante", async () => {
    const expiresAt = new Date(Date.now() + 5000);
    await revokeSession({ jti: JTI, userId: "u_1", organizationId: null, scope: "platform", expiresAt });
    await revokeSession({ jti: JTI, userId: "u_1", organizationId: null, scope: "platform", expiresAt });
    for (const q of m.queries) {
      expect(q.sql).toContain("ON CONFLICT (jti) DO NOTHING");
      expect(q.params).toEqual([JTI, "platform", "u_1", null, expiresAt]);
    }
  });

  it("consumeOneTimeToken : vrai pour le premier usage, faux pour un rejeu", async () => {
    const input = { jti: "f".repeat(32), userId: "u_1", organizationId: "org_a", expiresAt: new Date(Date.now() + 1000) };
    m.rowCount = 1;
    expect(await consumeOneTimeToken(input)).toBe(true);
    m.rowCount = 0;
    expect(await consumeOneTimeToken(input)).toBe(false);
    expect(m.queries[0].sql).toContain("'oauth_state'");
    expect(m.queries[0].sql).toContain("ON CONFLICT (jti) DO NOTHING");
  });

  it("un jti d'état OAuth ne vaut jamais révocation de session (kind filtré)", async () => {
    await isSessionRevoked(JTI);
    expect(m.queries[0].sql).toContain(`kind = 'session'`);
  });
});
