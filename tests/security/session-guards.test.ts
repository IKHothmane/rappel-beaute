import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { signJwt } from "@/lib/auth/crypto";
import { getSessionSecret } from "@/lib/auth/env";

/**
 * Audit RLS : les contrôles de session relisent l'état en base.
 * Un administrateur désactivé, un institut suspendu ou une référence d'un autre institut sont refusés.
 */
const state = vi.hoisted(() => ({
  platformUser: null as null | Record<string, unknown>,
  userState: null as null | Record<string, unknown>,
  refFound: true,
  queries: [] as Array<{ sql: string; params: unknown[] }>,
}));

vi.mock("@/lib/db/platform-users", () => ({
  getPlatformUserById: vi.fn(async () => state.platformUser),
}));
vi.mock("@/lib/db/users", () => ({
  getUserSessionState: vi.fn(async () => state.userState),
}));
vi.mock("@/lib/db/pool", () => ({
  pool: {
    query: vi.fn(async (sql: string, params: unknown[]) => {
      state.queries.push({ sql, params });
      return { rowCount: state.refFound ? 1 : 0, rows: [] };
    }),
  },
}));

import { requireAppSession, requirePlatformSession } from "@/lib/auth/api-guard";
import { assertAppointmentReferences } from "@/lib/db/appointments";

function requestWith(token: string): NextRequest {
  return {
    cookies: { get: (name: string) => (name === "rappel_session" ? { value: token } : undefined) },
    nextUrl: { pathname: "/api/test" },
  } as unknown as NextRequest;
}

const platformToken = () =>
  signJwt(
    { id: "pu_1", email: "a@t.test", firstName: "A", lastName: "A", role: "SUPPORT", scope: "platform", accountType: "PLATFORM" },
    getSessionSecret(),
    3600,
  );
const appToken = () =>
  signJwt(
    {
      id: "u_1", email: "u@t.test", firstName: "U", lastName: "U", role: "OWNER",
      organizationId: "org_a", orgName: "A", orgSlug: "a", scope: "app", accountType: "ORGANIZATION",
      mustChangePassword: false, sessionVersion: 0,
    },
    getSessionSecret(),
    3600,
  );

beforeEach(() => {
  state.platformUser = null;
  state.userState = null;
  state.refFound = true;
  state.queries = [];
});

describe("session back-office", () => {
  it("refuse un administrateur désactivé ou supprimé malgré un jeton valide", async () => {
    state.platformUser = null;
    const auth = await requirePlatformSession(requestWith(platformToken()));
    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.response.status).toBe(401);
  });

  it("applique le rôle de la base, pas celui du jeton", async () => {
    state.platformUser = { id: "pu_1", role: "SUPPORT", scope: "platform", accountType: "PLATFORM" };
    const auth = await requirePlatformSession(requestWith(platformToken()));
    expect(auth.ok).toBe(true);
    if (auth.ok) expect(auth.session?.role).toBe("SUPPORT");
  });

  it("refuse une session institut sur le back-office", async () => {
    const auth = await requirePlatformSession(requestWith(appToken()));
    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.response.status).toBe(403);
  });
});

describe("session institut", () => {
  it("refuse un institut suspendu", async () => {
    state.userState = { status: "ACTIVE", mustChangePassword: false, sessionVersion: 0, orgStatus: "SUSPENDED" };
    const auth = await requireAppSession(requestWith(appToken()));
    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.response.status).toBe(403);
  });

  it("accepte un institut actif", async () => {
    state.userState = { status: "ACTIVE", mustChangePassword: false, sessionVersion: 0, orgStatus: "ACTIVE" };
    expect((await requireAppSession(requestWith(appToken()))).ok).toBe(true);
  });
});

describe("références d'un rendez-vous", () => {
  it("refuse une référence absente de l'institut", async () => {
    state.refFound = false;
    await expect(assertAppointmentReferences("org_a", { customerId: "c_autre_institut" })).rejects.toThrow("REFERENCE_NOT_FOUND");
    expect(state.queries[0].params).toEqual(["c_autre_institut", "org_a"]);
  });

  it("contrôle chaque référence fournie, ignore les absentes", async () => {
    await assertAppointmentReferences("org_a", { customerId: "c", serviceId: "s", staffId: null, resourceId: undefined });
    expect(state.queries.map((q) => q.sql.match(/FROM "(\w+)"/)?.[1])).toEqual(["Customer", "Service"]);
  });
});
