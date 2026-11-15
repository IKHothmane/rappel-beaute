import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  role: "OWNER",
  allowed: true,
  enabled: true,
  calls: [] as Array<{ name: string; args: unknown[] }>,
  failure: null as null | { code: string },
  limiter: { allowed: true } as { allowed: boolean; retryAfterSec?: number },
}));

vi.mock("@/lib/db/pool", () => ({ pool: { query: vi.fn() } }));
vi.mock("@/lib/auth/api-guard", async () => {
  const { NextResponse } = await import("next/server");
  return {
    stripOrganizationId: (body: Record<string, unknown>) => {
      const { organizationId: _ignored, ...rest } = body;
      return rest;
    },
    requireFeatureWrite: vi.fn(async () =>
      state.allowed
        ? { ok: true, session: { id: "user_1", organizationId: "org_session", role: state.role, firstName: "Sara", lastName: "Alami" } }
        : { ok: false, response: NextResponse.json({ error: "Accès refusé." }, { status: 403 }) },
    ),
  };
});
vi.mock("@/lib/rate-limit", () => ({
  identityHash: (value: string) => `h_${value}`,
  consumeDimensions: vi.fn(async () => state.limiter),
}));
vi.mock("@/lib/loyalty/merge", async () => {
  const actual = await vi.importActual<typeof import("@/lib/loyalty/merge")>("@/lib/loyalty/merge");
  const track = (name: string, value: unknown) =>
    vi.fn(async (...args: unknown[]) => {
      state.calls.push({ name, args });
      if (state.failure) throw new actual.MergeError(state.failure.code as never);
      return value;
    });
  return {
    ...actual,
    isLoyaltyMergeEnabled: () => state.enabled,
    previewMerge: track("previewMerge", { mode: "assign", canonicalPhone: "0612345678" }),
    assignPhoneToCard: track("assignPhoneToCard", { mode: "assigned" }),
    mergeCustomers: track("mergeCustomers", { mergeId: "m1", replayed: false }),
  };
});

import { POST } from "@/app/api/loyalty/merge/route";

const version = "a".repeat(64);
const mergeBody = {
  action: "merge",
  sourceCustomerId: "cust_s",
  targetCustomerId: "cust_t",
  idempotencyKey: "key_12345678",
  previewVersion: version,
  identityConfirmed: true,
};

function post(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/loyalty/merge", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  state.role = "OWNER";
  state.allowed = true;
  state.enabled = true;
  state.calls = [];
  state.failure = null;
  state.limiter = { allowed: true };
});

describe("POST /api/loyalty/merge", () => {
  it("refuse sans droit d'écriture fidélité et pour les rôles autres que propriétaire / gestionnaire", async () => {
    state.allowed = false;
    expect((await POST(post(mergeBody))).status).toBe(403);
    state.allowed = true;
    for (const role of ["STAFF", "CASHIER", "ACCOUNTANT"]) {
      state.role = role;
      const response = await POST(post(mergeBody));
      expect(response.status).toBe(403);
      expect((await response.json()).code).toBe("FORBIDDEN");
    }
    expect(state.calls).toHaveLength(0);
    state.role = "MANAGER";
    expect((await POST(post(mergeBody))).status).toBe(200);
  });

  it("est désactivée par défaut : 404 MERGE_DISABLED, aucune lecture de fiche", async () => {
    state.enabled = false;
    const response = await POST(post({ action: "phone-preview", sourceCustomerId: "cust_s", phone: "0612345678" }));
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "MERGE_DISABLED" });
    expect(state.calls).toHaveLength(0);
  });

  it("valide strictement le corps (types, clés inconnues, source ambiguë, identité)", async () => {
    const bad = [
      {},
      { action: "nope" },
      { action: "phone-preview", phone: "0612345678" },
      { action: "phone-preview", sourceCustomerId: "cust_s", sourceCardToken: "RBLOY_ABCDEFGH", phone: "0612345678" },
      { action: "phone-preview", sourceCustomerId: "cust_s", phone: 612345678 },
      { action: "phone-preview", sourceCustomerId: "cust_s", phone: "0612345678", extra: true },
      { action: "assign-phone", sourceCustomerId: "cust_s", phone: "0612345678", firstName: 5 },
      { ...mergeBody, previewVersion: "xyz" },
      { ...mergeBody, idempotencyKey: "court" },
      { ...mergeBody, identityConfirmed: "true" },
      { ...mergeBody, targetCustomerId: undefined },
      { ...mergeBody, unknown: 1 },
    ];
    for (const body of bad) {
      const response = await POST(post(body));
      expect(response.status, JSON.stringify(body)).toBe(400);
    }
    const unconfirmed = await POST(post({ ...mergeBody, identityConfirmed: false }));
    expect(unconfirmed.status).toBe(400);
    expect((await unconfirmed.json()).code).toBe("IDENTITY_NOT_CONFIRMED");
    expect((await POST(post(mergeBody, { "content-length": "999999" }))).status).toBe(413);
    expect(state.calls).toHaveLength(0);
  });

  it("ignore un organizationId fourni par le client et agit sur l'institut de la session", async () => {
    const response = await POST(post({ ...mergeBody, organizationId: "org_other" }));
    expect(response.status).toBe(200);
    const call = state.calls.find((entry) => entry.name === "mergeCustomers")!;
    expect(call.args[0]).toBe("org_session");
    expect(call.args[1]).toEqual({ id: "user_1", name: "Sara Alami" });
    expect(JSON.stringify(call.args)).not.toContain("org_other");
  });

  it("route chaque action vers sa fonction", async () => {
    expect((await POST(post({ action: "phone-preview", sourceCardToken: "RBLOY_ABCDEFGH", phone: "0612345678" }))).status).toBe(200);
    expect((await POST(post({ action: "assign-phone", sourceCustomerId: "cust_s", phone: "0612345678", firstName: "Salma" }))).status).toBe(200);
    expect(state.calls.map((entry) => entry.name)).toEqual(["previewMerge", "assignPhoneToCard"]);
  });

  it.each([
    ["STALE_PREVIEW", 409],
    ["ALREADY_MERGED", 409],
    ["SAME_CUSTOMER", 409],
    ["NOT_FOUND", 404],
    ["MERGE_IN_PROGRESS", 423],
  ])("traduit %s en %i", async (code, status) => {
    state.failure = { code };
    const response = await POST(post(mergeBody));
    expect(response.status).toBe(status);
    expect((await response.json()).code).toBe(code);
  });

  it("applique le limiteur de débit dédié (429)", async () => {
    state.limiter = { allowed: false, retryAfterSec: 42 };
    const response = await POST(post(mergeBody));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    expect(state.calls).toHaveLength(0);
  });
});
