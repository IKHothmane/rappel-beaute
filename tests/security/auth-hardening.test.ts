import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { hashPassword, verifyPassword, signJwt, getSessionSecret } from "@/lib/auth/crypto";

/**
 * Durcissement de l'authentification (rôle relu en base, jeton de réinitialisation,
 * mot de passe actuel exigé, opt-in WhatsApp). Aucune base : le pool est simulé et chaque requête SQL est
 * enregistrée pour vérifier atomicité (BEGIN / COMMIT sur le même client) et contenu des écritures.
 */
type Call = { sql: string; params: unknown[]; via: "pool" | "client" };

const db = vi.hoisted(() => ({
  calls: [] as Array<{ sql: string; params: unknown[]; via: "pool" | "client" }>,
  /** Réponse par requête : premier motif qui correspond. */
  responders: [] as Array<{ match: RegExp; reply: (params: unknown[]) => { rows: unknown[]; rowCount?: number } }>,
}));

function answer(sql: string, params: unknown[]) {
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

import { changeOwnPassword, getUserSessionState } from "@/lib/db/users";
import { activateAccount, hashActivationToken, issuePasswordResetToken } from "@/lib/db/activation";
import { platformResetUserPassword, setPlatformWideUserRole } from "@/lib/db/admin-users";

const clientCalls = () => db.calls.filter((c) => c.via === "client");
const sqlOf = (c: Call) => c.sql.replace(/\s+/g, " ").trim();

beforeEach(() => {
  db.calls = [];
  db.responders = [];
});

function userRow(over: Record<string, unknown> = {}) {
  return {
    id: "u_1",
    email: "u@t.test",
    loginPhone: null,
    firstName: "Sara",
    lastName: "A",
    role: "STAFF",
    passwordHash: hashPassword("ancien-mdp-1"),
    organizationId: "org_a",
    orgName: "A",
    orgSlug: "a",
    mustChangePassword: false,
    sessionVersion: 4,
    ...over,
  };
}

describe("getUserSessionState : rôle courant dans la même requête", () => {
  it("renvoie le rôle de la base avec une seule requête", async () => {
    db.responders.push({
      match: /FROM "User" u JOIN "Organization"/,
      reply: () => ({ rows: [{ status: "ACTIVE", mustChangePassword: false, sessionVersion: 2, role: "STAFF", orgStatus: "ACTIVE" }] }),
    });
    const state = await getUserSessionState("u_1");
    expect(state?.role).toBe("STAFF");
    expect(db.calls).toHaveLength(1);
    expect(sqlOf(db.calls[0])).toContain("u.role");
  });

  it("restreint la lecture à l'institut du jeton : aucune ligne, session invalide", async () => {
    db.responders.push({ match: /FROM "User" u JOIN "Organization"/, reply: () => ({ rows: [] }) });
    const state = await getUserSessionState("u_1", "org_autre");
    expect(state).toBeNull();
    expect(db.calls).toHaveLength(1);
    expect(sqlOf(db.calls[0])).toContain('WHERE u.id = $1 AND u."organizationId" = $2');
    expect(db.calls[0].params).toEqual(["u_1", "org_autre"]);
  });

  it("un institut vide ne désactive pas le filtre (échec fermé)", async () => {
    await getUserSessionState("u_1", "");
    expect(sqlOf(db.calls[0])).toContain('u."organizationId" = $2');
    expect(db.calls[0].params).toEqual(["u_1", ""]);
  });
});

describe("changeOwnPassword", () => {
  function selectUser(row: Record<string, unknown>) {
    db.responders.push({ match: /FOR UPDATE OF u/, reply: () => ({ rows: [row] }) });
    db.responders.push({ match: /^\s*UPDATE "User"/, reply: () => ({ rows: [{ sessionVersion: 5 }] }) });
  }

  it("exige le mot de passe actuel hors flux temporaire", async () => {
    selectUser(userRow());
    await expect(
      changeOwnPassword({ userId: "u_1", organizationId: "org_a", newPassword: "nouveau-mdp-2" }),
    ).rejects.toThrow("CURRENT_PASSWORD_REQUIRED");
    expect(clientCalls().some((c) => /^UPDATE "User"/.test(sqlOf(c)))).toBe(false);
    expect(clientCalls().map((c) => sqlOf(c)).at(-1)).toBe("ROLLBACK");
  });

  it("refuse un mot de passe actuel incorrect", async () => {
    selectUser(userRow());
    await expect(
      changeOwnPassword({ userId: "u_1", organizationId: "org_a", newPassword: "nouveau-mdp-2", currentPassword: "faux-mdp-123" }),
    ).rejects.toThrow("CURRENT_PASSWORD_INVALID");
    expect(clientCalls().some((c) => /^UPDATE "User"/.test(sqlOf(c)))).toBe(false);
  });

  it("change le mot de passe, incrémente sessionVersion et audite dans la même transaction", async () => {
    selectUser(userRow());
    const session = await changeOwnPassword({
      userId: "u_1",
      organizationId: "org_a",
      newPassword: "nouveau-mdp-2",
      currentPassword: "ancien-mdp-1",
    });
    expect(session.sessionVersion).toBe(5);
    expect(session.mustChangePassword).toBe(false);
    expect(session.role).toBe("STAFF");

    const sql = clientCalls().map(sqlOf);
    expect(sql[0]).toBe("BEGIN");
    expect(sql.at(-1)).toBe("COMMIT");
    expect(sql.some((s) => s.includes(`"sessionVersion" = "sessionVersion" + 1`))).toBe(true);
    expect(sql.some((s) => s.startsWith('INSERT INTO "AuditLog"'))).toBe(true);
    // Aucune écriture hors transaction.
    expect(db.calls.filter((c) => c.via === "pool")).toHaveLength(0);
    const update = clientCalls().find((c) => /^UPDATE "User"/.test(sqlOf(c)))!;
    expect(verifyPassword("nouveau-mdp-2", String(update.params[0]))).toBe(true);
  });

  it("n'exige pas le mot de passe actuel pour le mot de passe temporaire", async () => {
    selectUser(userRow({ mustChangePassword: true }));
    const session = await changeOwnPassword({ userId: "u_1", organizationId: "org_a", newPassword: "nouveau-mdp-2" });
    expect(session.sessionVersion).toBe(5);
  });

  it("refuse de réutiliser le mot de passe actuel et annule la transaction", async () => {
    selectUser(userRow());
    await expect(
      changeOwnPassword({ userId: "u_1", organizationId: "org_a", newPassword: "ancien-mdp-1", currentPassword: "ancien-mdp-1" }),
    ).rejects.toThrow("PASSWORD_REUSE");
    expect(clientCalls().map(sqlOf).at(-1)).toBe("ROLLBACK");
  });

  it("annule tout si l'audit échoue (pas de changement sans trace)", async () => {
    selectUser(userRow());
    db.responders.unshift({
      match: /INSERT INTO "AuditLog"/,
      reply: () => {
        throw new Error("audit down");
      },
    });
    await expect(
      changeOwnPassword({ userId: "u_1", organizationId: "org_a", newPassword: "nouveau-mdp-2", currentPassword: "ancien-mdp-1" }),
    ).rejects.toThrow("audit down");
    expect(clientCalls().map(sqlOf).at(-1)).toBe("ROLLBACK");
  });
});

describe("jeton de réinitialisation", () => {
  it("ne stocke que le haché et renvoie le clair", async () => {
    db.responders.push({ match: /SELECT id FROM "User"/, reply: () => ({ rows: [{ id: "u_1" }] }) });
    const token = await issuePasswordResetToken("u@t.test");
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    const insert = db.calls.find((c) => c.sql.includes('INSERT INTO "ActivationToken"'))!;
    expect(insert.params[2]).toBe(hashActivationToken(token!));
    expect(insert.params[2]).not.toBe(token);
    expect(String(insert.params[2])).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("recherche l'e-mail comme l'unicité globale (LOWER(BTRIM)) et normalise l'entrée", async () => {
    db.responders.push({ match: /SELECT id FROM "User"/, reply: () => ({ rows: [{ id: "u_1" }] }) });
    await issuePasswordResetToken("  U@T.test ");
    const select = clientCalls().find((c) => sqlOf(c).startsWith('SELECT id FROM "User"'))!;
    expect(sqlOf(select)).toContain("LOWER(BTRIM(email)) = $1");
    expect(select.params).toEqual(["u@t.test"]);
  });

  it("e-mail partagé par plusieurs comptes : n'émet aucun jeton et n'écrit rien", async () => {
    db.responders.push({ match: /SELECT id FROM "User"/, reply: () => ({ rows: [{ id: "u_1" }, { id: "u_2" }] }) });
    expect(await issuePasswordResetToken("dup@t.test")).toBeNull();
    const sql = clientCalls().map(sqlOf);
    expect(sql.some((s) => s.includes('"ActivationToken"'))).toBe(false);
    expect(sql.at(-1)).toBe("ROLLBACK");
  });

  const row = (over: Record<string, unknown> = {}) => ({
    id: "act_1",
    userId: "u_1",
    organizationId: "org_a",
    email: "u@t.test",
    userStatus: "ACTIVE",
    expiresAt: new Date(Date.now() + 60_000),
    usedAt: null,
    ...over,
  });
  const tokenLookup = (r: Record<string, unknown> | null) =>
    db.responders.push({ match: /FROM "ActivationToken" t/, reply: () => ({ rows: r ? [r] : [] }) });

  it("accepte un jeton haché ou un jeton clair déjà émis (même requête, deux formes)", async () => {
    tokenLookup(row());
    await activateAccount("a".repeat(64), "nouveau-mdp-2");
    const select = clientCalls().find((c) => c.sql.includes('FROM "ActivationToken" t'))!;
    expect(select.params[0]).toEqual([hashActivationToken("a".repeat(64)), "a".repeat(64)]);
  });

  it("incrémente sessionVersion, consomme tous les jetons du compte et audite dans la transaction", async () => {
    tokenLookup(row());
    const result = await activateAccount("b".repeat(64), "nouveau-mdp-2");
    expect(result.email).toBe("u@t.test");
    const sql = clientCalls().map(sqlOf);
    expect(sql[0]).toBe("BEGIN");
    expect(sql.at(-1)).toBe("COMMIT");
    const update = sql.find((s) => s.startsWith('UPDATE "User"'))!;
    expect(update).toContain(`"sessionVersion" = "sessionVersion" + 1`);
    expect(update).toContain("status <> 'DISABLED'");
    expect(update).not.toContain("status = 'ACTIVE'");
    expect(sql.some((s) => s.includes('UPDATE "ActivationToken" SET "usedAt" = NOW() WHERE "userId" = $1 AND "usedAt" IS NULL'))).toBe(true);
    expect(sql.some((s) => s.startsWith('INSERT INTO "AuditLog"'))).toBe(true);
  });

  it("ne réactive pas un compte désactivé", async () => {
    tokenLookup(row({ userStatus: "DISABLED" }));
    await expect(activateAccount("c".repeat(64), "nouveau-mdp-2")).rejects.toThrow("TOKEN_INVALID");
    expect(clientCalls().some((c) => sqlOf(c).startsWith('UPDATE "User"'))).toBe(false);
    expect(clientCalls().map(sqlOf).at(-1)).toBe("ROLLBACK");
  });

  it("désactivation concurrente : aucune ligne mise à jour => jeton invalide", async () => {
    tokenLookup(row());
    db.responders.unshift({ match: /^\s*UPDATE "User"/, reply: () => ({ rows: [], rowCount: 0 }) });
    await expect(activateAccount("d".repeat(64), "nouveau-mdp-2")).rejects.toThrow("TOKEN_INVALID");
    expect(clientCalls().map(sqlOf).at(-1)).toBe("ROLLBACK");
  });

  it("refuse un jeton déjà utilisé, expiré, inconnu", async () => {
    tokenLookup(row({ usedAt: new Date() }));
    await expect(activateAccount("e".repeat(64), "nouveau-mdp-2")).rejects.toThrow("TOKEN_INVALID");
    db.responders = [];
    tokenLookup(row({ expiresAt: new Date(Date.now() - 1000) }));
    await expect(activateAccount("e".repeat(64), "nouveau-mdp-2")).rejects.toThrow("TOKEN_EXPIRED");
    db.responders = [];
    tokenLookup(null);
    await expect(activateAccount("f".repeat(64), "nouveau-mdp-2")).rejects.toThrow("TOKEN_INVALID");
  });

  it("refuse qu'un haché copié depuis la base serve de jeton", async () => {
    tokenLookup(row());
    await expect(activateAccount(hashActivationToken("g".repeat(64)), "nouveau-mdp-2")).rejects.toThrow("TOKEN_INVALID");
    expect(db.calls).toHaveLength(0);
  });
});

describe("administration des utilisateurs", () => {
  const platformActor = { id: "pu_1", firstName: "Root", lastName: "Admin", email: "r@t.test", role: "SUPER_ADMIN", scope: "platform", accountType: "PLATFORM" } as never;

  function existingUser(over: Record<string, unknown> = {}) {
    db.responders.push({
      match: /LEFT JOIN LATERAL/,
      reply: () => ({
        rows: [{
          id: "u_1", email: "u@t.test", firstName: "S", lastName: "A", phone: null, role: "OWNER", status: "ACTIVE",
          organizationId: "org_a", organizationName: "A", organizationCity: null, createdAt: new Date(),
          mustChangePassword: false, sessionVersion: 1, lastLoginAt: null, ...over,
        }],
      }),
    });
  }

  it("un changement de rôle révoque les sessions dans la même transaction que l'audit", async () => {
    existingUser();
    await setPlatformWideUserRole(platformActor, "u_1", "STAFF");
    const sql = clientCalls().map(sqlOf);
    expect(sql[0]).toBe("BEGIN");
    expect(sql.at(-1)).toBe("COMMIT");
    const update = sql.find((s) => s.startsWith('UPDATE "User"'))!;
    expect(update).toContain("role = $2");
    expect(update).toContain(`"sessionVersion" = "sessionVersion" + 1`);
    expect(sql.filter((s) => s.startsWith("INSERT INTO")).length).toBe(2);
  });

  it("le mot de passe temporaire de réinitialisation est aléatoire, jamais une valeur fixe", async () => {
    existingUser();
    const a = await platformResetUserPassword(platformActor, "u_1");
    existingUser();
    const b = await platformResetUserPassword(platformActor, "u_1");
    expect(a.temporaryPassword).not.toBe(b.temporaryPassword);
    expect(a.temporaryPassword.length).toBeGreaterThanOrEqual(10);
    const update = clientCalls().find((c) => sqlOf(c).startsWith('UPDATE "User"'))!;
    expect(verifyPassword(a.temporaryPassword, String(update.params[0]))).toBe(true);
  });
});

describe("POST /api/auth/change-password", () => {
  const sessionToken = () =>
    signJwt(
      {
        id: "u_1", email: "u@t.test", firstName: "S", lastName: "A", role: "STAFF",
        organizationId: "org_a", orgName: "A", orgSlug: "a", scope: "app", accountType: "ORGANIZATION",
        mustChangePassword: false, sessionVersion: 4,
      },
      getSessionSecret(),
      3600,
    );

  function post(body: unknown) {
    return new NextRequest("http://localhost:3000/api/auth/change-password/", {
      method: "POST",
      headers: { cookie: `rappel_session=${sessionToken()}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function loadRoute() {
    vi.resetModules();
    vi.doMock("@/lib/rate-limit", () => ({
      consumeDimensions: async () => ({ allowed: true }),
      identityHash: (v: string) => v,
      RATE_POLICIES: { changePassword: { user: {}, ip: {} } },
    }));
    vi.doMock("@/lib/db/users", async () => {
      return {
        MAX_PASSWORD_LENGTH: 200,
        getUserSessionState: async () => ({ status: "ACTIVE", mustChangePassword: false, sessionVersion: 4, role: "STAFF" }),
        changeOwnPassword: changeMock,
      };
    });
    return (await import("@/app/api/auth/change-password/route")).POST;
  }
  const changeMock = vi.fn();

  beforeEach(() => changeMock.mockReset());

  it("transmet le mot de passe actuel et ré-émet la session avec la nouvelle version", async () => {
    changeMock.mockResolvedValue({
      id: "u_1", email: "u@t.test", firstName: "S", lastName: "A", role: "STAFF", organizationId: "org_a",
      orgName: "A", orgSlug: "a", orgLogoUrl: null, scope: "app", accountType: "ORGANIZATION",
      mustChangePassword: false, sessionVersion: 5,
    });
    const POST = await loadRoute();
    const res = await POST(post({ currentPassword: "ancien-mdp-1", newPassword: "nouveau-mdp-2", confirmPassword: "nouveau-mdp-2" }));
    expect(res.status).toBe(200);
    expect(changeMock).toHaveBeenCalledWith(expect.objectContaining({ currentPassword: "ancien-mdp-1", userId: "u_1" }));
    const cookie = res.cookies.get("rappel_session");
    expect(cookie?.value).toBeTruthy();
    const payload = JSON.parse(Buffer.from(cookie!.value.split(".")[1], "base64url").toString());
    expect(payload.sessionVersion).toBe(5);
  });

  it("renvoie 400 si le mot de passe actuel manque ou est faux", async () => {
    const POST = await loadRoute();
    changeMock.mockRejectedValueOnce(new Error("CURRENT_PASSWORD_REQUIRED"));
    const missing = await POST(post({ newPassword: "nouveau-mdp-2", confirmPassword: "nouveau-mdp-2" }));
    expect(missing.status).toBe(400);
    expect((await missing.json()).code).toBe("CURRENT_PASSWORD_REQUIRED");

    changeMock.mockRejectedValueOnce(new Error("CURRENT_PASSWORD_INVALID"));
    const wrong = await POST(post({ currentPassword: "x", newPassword: "nouveau-mdp-2", confirmPassword: "nouveau-mdp-2" }));
    expect(wrong.status).toBe(400);
    expect(wrong.cookies.get("rappel_session")).toBeUndefined();
  });

  it("rejette les corps non textuels avant d'atteindre la base", async () => {
    const POST = await loadRoute();
    const res = await POST(post({ newPassword: 12345678, confirmPassword: 12345678 }));
    expect(res.status).toBe(400);
    expect(changeMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/whatsapp/send : opt-in marketing dérivé côté serveur", () => {
  const createTask = vi.fn();
  const sendTask = vi.fn();

  async function loadRoute() {
    vi.resetModules();
    vi.doMock("@/lib/auth/api-guard", () => ({
      requireFeatureWriteLimited: async () => ({
        ok: true,
        session: { id: "u_1", firstName: "S", lastName: "A", role: "STAFF", organizationId: "org_a" },
      }),
      stripOrganizationId: <T extends Record<string, unknown>>(b: T) => {
        const { organizationId: _o, ...rest } = b;
        return rest;
      },
    }));
    vi.doMock("@/lib/rbac", () => ({ canSendWhatsapp: () => true }));
    vi.doMock("@/lib/whatsapp/send", () => ({
      isAutomaticWhatsAppEnabled: () => true,
      canSendDirectWhatsAppViaMeta: () => true,
      sendDirectWhatsAppTask: sendTask,
      WHATSAPP_DIRECT_SEND_DISABLED_MESSAGE: "off",
      // La route (commit « envoi direct du rappel de rendez-vous ») teste `instanceof AppointmentWhatsAppError`.
      AppointmentWhatsAppError: class AppointmentWhatsAppError extends Error {},
    }));
    vi.doMock("@/lib/db/whatsapp", () => ({ createAIWhatsAppTask: createTask }));
    return (await import("@/app/api/whatsapp/send/route")).POST;
  }

  function post(body: unknown) {
    return new NextRequest("http://localhost:3000/api/whatsapp/send/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    createTask.mockReset().mockResolvedValue({ id: "wt_1" });
    sendTask.mockReset().mockResolvedValue({ ok: true });
  });

  it("conserve le bouton de la fiche cliente (REACTIVATION) sans opt-in", async () => {
    const POST = await loadRoute();
    await POST(post({ customerId: "c_1", message: "Bonjour", type: "REACTIVATION", staffClick: true }));
    expect(createTask.mock.calls[0][1].allowWithoutMarketingOptIn).toBe(true);
  });

  it("ignore staffClick pour tout autre type marketing", async () => {
    const POST = await loadRoute();
    await POST(post({ customerId: "c_1", message: "Promo", type: "PROMOTION", staffClick: true }));
    expect(createTask.mock.calls[0][1].allowWithoutMarketingOptIn).toBe(false);
    await POST(post({ customerId: "c_1", message: "Promo", staffClick: true }));
    expect(createTask.mock.calls[1][1].allowWithoutMarketingOptIn).toBe(false);
  });
});
