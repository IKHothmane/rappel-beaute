import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unicité globale de l'e-mail dans le code : partout où un User est créé ou son e-mail modifié, une violation 23505
 * de l'index "User_email_lower_unique" (migration EN ATTENTE, non appliquée ici) est traduite en erreur métier
 * générique, et les vérifications applicatives (insensibles à la casse, avec trim) restent DANS la transaction.
 * Doubles de base uniquement : la violation est simulée avec le nom de contrainte de la migration.
 */
const m = vi.hoisted(() => ({
  queries: [] as string[],
  clientQuery: vi.fn(),
  poolQuery: vi.fn(),
  createInstitute: vi.fn(),
}));

vi.mock("@/lib/db/pool", () => ({
  pool: {
    query: (...a: unknown[]) => m.poolQuery(...a),
    connect: async () => ({
      query: async (sql: string, params?: unknown[]) => {
        m.queries.push(String(sql));
        return m.clientQuery(String(sql), params);
      },
      release: () => undefined,
    }),
  },
}));
vi.mock("@/lib/db/tenant-context", async (original) => ({ ...(await original<typeof import("@/lib/db/tenant-context")>()), bindPublicInstitute: vi.fn() }));
vi.mock("@/lib/db/institute-create", async (original) => ({
  ...(await original<typeof import("@/lib/db/institute-create")>()),
  resolveSignupPlan: async () => ({ id: "plan_1", price: 0, currency: "MAD", active: true }),
  createInstituteWithOwner: (...a: unknown[]) => m.createInstitute(...a),
}));
vi.mock("@/lib/subscriptions/plans", () => ({ getPlanByCode: async () => ({ id: "plan_1", price: 0, currency: "MAD", active: true }), listPlans: async () => [] }));
vi.mock("@/lib/db/platform-audit", () => ({ writePlatformAuditLog: vi.fn(async () => undefined) }));
vi.mock("@/lib/db/audit", () => ({ writeAuditLog: vi.fn(async () => undefined) }));
vi.mock("@/lib/db/admin-subscriptions", () => ({ changeSubscriptionPlan: vi.fn() }));

import { createPublicSignup } from "@/lib/db/public-signup";
import { createOrganization } from "@/lib/db/admin-organizations";
import { updatePlatformWideUserProfile } from "@/lib/db/admin-users";

const violation = (constraint: string) => Object.assign(new Error("duplicate key value violates unique constraint"), { code: "23505", constraint });
const ACTOR = { id: "pu_1", firstName: "Root", lastName: "Admin", email: "root@example.test", role: "SUPER_ADMIN", scope: "platform", accountType: "PLATFORM" } as never;

beforeEach(() => {
  vi.resetAllMocks();
  m.queries.length = 0;
  m.clientQuery.mockResolvedValue({ rows: [] });
  m.poolQuery.mockResolvedValue({ rows: [] });
});

describe("createPublicSignup (inscription par téléphone historique)", () => {
  const input = { personName: "Ada Lovelace", institut: "Institut Ada", email: "  Ada@Example.test ", phone: "0612345678", city: "Casablanca", address: "", website: null };

  it("23505 sur User_email_lower_unique : EMAIL_TAKEN générique, jamais l'erreur SQL brute", async () => {
    m.createInstitute.mockRejectedValue(violation("User_email_lower_unique"));
    await expect(createPublicSignup(input)).rejects.toMatchObject({ name: "PublicSignupError", code: "EMAIL_TAKEN" });
  });

  it("23505 sur l'index historique par institut : même traduction ; sur loginPhone : PHONE_TAKEN inchangé", async () => {
    m.createInstitute.mockRejectedValue(violation("User_organizationId_email_key"));
    await expect(createPublicSignup(input)).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
    m.createInstitute.mockRejectedValue(violation("User_loginPhone_key"));
    await expect(createPublicSignup(input)).rejects.toMatchObject({ code: "PHONE_TAKEN" });
  });

  it("vérification applicative dans la transaction : insensible à la casse et aux espaces (BTRIM), comptes institut ET plateforme", async () => {
    m.clientQuery.mockImplementation(async (sql: string) => (sql.includes('FROM "PlatformUser"') ? { rows: [{ id: "pu_1" }] } : { rows: [] }));
    await expect(createPublicSignup(input)).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
    expect(m.createInstitute).not.toHaveBeenCalled();
    const emailChecks = m.queries.filter((q) => /LOWER\(BTRIM\(email\)\)/.test(q));
    expect(emailChecks.length).toBeGreaterThanOrEqual(2);
    expect(m.queries.indexOf("BEGIN")).toBeLessThan(m.queries.findIndex((q) => /LOWER\(BTRIM\(email\)\)/.test(q)));
  });

  it("sans e-mail (téléphone seul) : aucune comparaison d'e-mail", async () => {
    m.createInstitute.mockResolvedValue({});
    await createPublicSignup({ ...input, email: "" });
    expect(m.queries.some((q) => /LOWER\(BTRIM\(email\)\)/.test(q))).toBe(false);
  });
});

describe("createOrganization (back-office)", () => {
  const input = {
    name: "Institut Ada", slug: "institut-ada", email: "contact@example.test", phone: "0612345678", plan: "INSTITUT",
    owner: { firstName: "Ada", lastName: "Owner", email: " Owner@Example.test ", phone: "0612345678" },
  } as never;

  it("adresse du propriétaire déjà utilisée (casse, plateforme comprise) : OWNER_EMAIL_TAKEN avant toute écriture", async () => {
    m.clientQuery.mockImplementation(async (sql: string) => (sql.includes('FROM "PlatformUser"') ? { rows: [{ "?column?": 1 }] } : { rows: [] }));
    await expect(createOrganization(ACTOR, input)).rejects.toThrow("OWNER_EMAIL_TAKEN");
    expect(m.queries.some((q) => q.includes('INSERT INTO "User"'))).toBe(false);
    expect(m.queries.some((q) => q === "ROLLBACK")).toBe(true);
  });

  it("23505 de l'index global à l'insertion du propriétaire : OWNER_EMAIL_TAKEN, transaction annulée", async () => {
    m.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO "User"')) throw violation("User_email_lower_unique");
      return { rows: [] };
    });
    await expect(createOrganization(ACTOR, input)).rejects.toThrow("OWNER_EMAIL_TAKEN");
    expect(m.queries).toContain("ROLLBACK");
    expect(m.queries).not.toContain("COMMIT");
  });
});

describe("updatePlatformWideUserProfile (changement d'e-mail par le back-office)", () => {
  const row = {
    id: "u_1", email: "old@example.test", firstName: "Ada", lastName: "Owner", phone: null, role: "OWNER", status: "ACTIVE",
    organizationId: "org_1", organizationName: "Institut", organizationCity: null, createdAt: new Date(), mustChangePassword: false,
    sessionVersion: 0, lastLoginAt: null,
  };
  beforeEach(() => m.poolQuery.mockResolvedValue({ rows: [row] }));

  it("adresse déjà utilisée par un autre compte : EMAIL_TAKEN, aucune mise à jour (la vérification est dans la transaction)", async () => {
    m.clientQuery.mockImplementation(async (sql: string) => (sql.includes('FROM "User"') ? { rows: [{ "?column?": 1 }] } : { rows: [] }));
    await expect(updatePlatformWideUserProfile(ACTOR, "u_1", { email: "Taken@Example.test" })).rejects.toThrow("EMAIL_TAKEN");
    expect(m.queries.some((q) => q.startsWith('UPDATE "User"'))).toBe(false);
    expect(m.queries.at(-1)).toBe("ROLLBACK");
  });

  it("23505 de l'index global : EMAIL_TAKEN générique", async () => {
    m.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.startsWith('UPDATE "User"')) throw violation("User_email_lower_unique");
      return { rows: [] };
    });
    await expect(updatePlatformWideUserProfile(ACTOR, "u_1", { email: "new@example.test" })).rejects.toThrow("EMAIL_TAKEN");
  });

  it("nouvelle adresse : emailVerifiedAt remis à NULL ; même adresse (casse près) : aucune remise à zéro", async () => {
    await updatePlatformWideUserProfile(ACTOR, "u_1", { email: "new@example.test" });
    expect(m.queries.find((q) => q.startsWith('UPDATE "User"'))).toContain('"emailVerifiedAt" = NULL');
    m.queries.length = 0;
    await updatePlatformWideUserProfile(ACTOR, "u_1", { email: "OLD@example.test", firstName: "Ada" });
    expect(m.queries.find((q) => q.startsWith('UPDATE "User"'))).not.toContain("emailVerifiedAt");
    // Pas de comparaison d'unicité quand l'adresse ne change pas.
    expect(m.queries.some((q) => /LOWER\(BTRIM\(email\)\)/.test(q))).toBe(false);
  });
});
