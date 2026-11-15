import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/db/pool", () => ({ pool: { query } }));

import { aliasJoin } from "@/lib/loyalty/card-alias";
import { resolveLoyaltyCardToken } from "@/lib/loyalty/cards";
import {
  isLoyaltyMergeEnabled,
  MergeError,
  mergeAccountTotals,
  MOVE_SPECS,
  normalizeMergePhone,
  planCumulativeReward,
} from "@/lib/loyalty/merge";
import { isAnonymousLoyaltyPhone } from "@/lib/loyalty/validation";

const program = { visitsPerReward: 5, stackRewards: true, programActive: true, openRewards: 0 };

describe("récompense par cumul", () => {
  it.each([
    // [a, b, récompense attendue, total, cycle]
    [3, 4, true, 7, 2],
    [2, 2, false, 4, 4],
    [4, 1, true, 5, 0],
    [6, 3, false, 9, 4], // 6 a déjà gagné son palier, 9 n'en franchit pas un nouveau
    [4, 4, true, 8, 3],
    [0, 3, false, 3, 3],
    [5, 5, false, 10, 0], // chacune a déjà gagné le sien
  ])("floor((a+b)/N) - floor(a/N) - floor(b/N) : %i + %i", (a, b, create, total, cycle) => {
    const plan = planCumulativeReward({ ...program, sourceVisits: a, targetVisits: b });
    expect({ create: plan.create, total: plan.totalVisits, cycle: plan.cycle }).toEqual({ create, total, cycle });
    expect(plan.crossings).toBeLessThanOrEqual(1);
  });

  it("respecte stackRewards, un programme désactivé et ne dépasse jamais une récompense", () => {
    const crossing = { ...program, sourceVisits: 4, targetVisits: 4 };
    expect(planCumulativeReward({ ...crossing, stackRewards: false, openRewards: 1 })).toMatchObject({ create: false, reason: "STACK_BLOCKED" });
    expect(planCumulativeReward({ ...crossing, stackRewards: false, openRewards: 0 })).toMatchObject({ create: true });
    expect(planCumulativeReward({ ...crossing, stackRewards: true, openRewards: 3 })).toMatchObject({ create: true });
    expect(planCumulativeReward({ ...crossing, programActive: false })).toMatchObject({ create: false, reason: "PROGRAM_INACTIVE" });
    expect(planCumulativeReward({ ...crossing, visitsPerReward: 0 })).toMatchObject({ crossings: 0, create: false });
  });

  it("additionne les points sans jamais produire un solde négatif", () => {
    expect(mergeAccountTotals({ balance: 120, lifetimePoints: 300 }, { balance: 30, lifetimePoints: 700 })).toEqual({
      balance: 150,
      lifetimePoints: 1000,
      transferred: 120,
    });
    expect(mergeAccountTotals(null, { balance: 5, lifetimePoints: 5 })).toEqual({ balance: 5, lifetimePoints: 5, transferred: 0 });
  });
});

describe("garde-fous de la fusion", () => {
  it("n'est active que si LOYALTY_MERGE_ENABLED vaut « on »", () => {
    expect(isLoyaltyMergeEnabled({})).toBe(false);
    expect(isLoyaltyMergeEnabled({ LOYALTY_MERGE_ENABLED: "" })).toBe(false);
    expect(isLoyaltyMergeEnabled({ LOYALTY_MERGE_ENABLED: "true" })).toBe(false);
    expect(isLoyaltyMergeEnabled({ LOYALTY_MERGE_ENABLED: "off" })).toBe(false);
    expect(isLoyaltyMergeEnabled({ LOYALTY_MERGE_ENABLED: "on" })).toBe(true);
    expect(isLoyaltyMergeEnabled({ LOYALTY_MERGE_ENABLED: " ON " })).toBe(true);
  });

  it("reconnaît une fiche anonyme (téléphone WL) et normalise les formats de numéro", () => {
    expect(isAnonymousLoyaltyPhone("WLa1b2c3d4")).toBe(true);
    expect(isAnonymousLoyaltyPhone("0612345678")).toBe(false);
    expect(isAnonymousLoyaltyPhone(null)).toBe(false);
    for (const raw of ["0612345678", "06 12 34 56 78", "+212 6 12 34 56 78", "00212612345678"]) {
      const { canonical, variants } = normalizeMergePhone(raw);
      expect(canonical).toBe("0612345678");
      expect(variants).toEqual(expect.arrayContaining(["0612345678", "+212612345678", "212612345678", "00212612345678", "612345678"]));
    }
    expect(() => normalizeMergePhone("abc")).toThrow(MergeError);
    expect(() => normalizeMergePhone(42)).toThrow(MergeError);
  });

  it("ne supprime jamais physiquement une fiche, une carte ou une ligne déplacée", () => {
    const source = readFileSync(path.join(process.cwd(), "src/lib/loyalty/merge.ts"), "utf8");
    expect(source).not.toMatch(/DELETE\s+FROM/i);
  });

  it("couvre toutes les tables portant un identifiant de fiche (schéma Prisma)", () => {
    const schema = readFileSync(path.join(process.cwd(), "prisma/schema.prisma"), "utf8");
    const found = new Set<string>();
    let model = "";
    for (const line of schema.split(/\r?\n/)) {
      const start = line.match(/^model (\w+) \{/);
      if (start) model = start[1];
      const column = line.match(/^\s+(customerId|buyerCustomerId|beneficiaryCustomerId)\s+String/);
      if (column) found.add(`${model}.${column[1]}`);
    }
    const handledApart = new Set([
      "LoyaltyAccount.customerId",
      "NotificationPreference.customerId",
      "CampaignRecipient.customerId",
      "WebPushSubscription.customerId",
      "PushAccessGrant.customerId",
      "LoyaltyCard.customerId",
    ]);
    const moved = new Set(MOVE_SPECS.map((spec) => `${spec.table}.${spec.column}`));
    const missing = [...found].filter((entry) => !moved.has(entry) && !handledApart.has(entry));
    expect(missing).toEqual([]);
  });
});

describe("suivi d'alias dans les lectures par jeton", () => {
  beforeEach(() => query.mockReset());

  it("aliasJoin résout une carte MERGED vers la survivante du même institut", () => {
    const sql = aliasJoin("al", "lc");
    expect(sql).toContain(`COALESCE(al."mergedIntoCardId", al.id)`);
    expect(sql).toContain(`lc."organizationId" = al."organizationId"`);
    expect(sql).toContain(`al.status IN ('ACTIVE', 'MERGED')`);
  });

  it("jeton complet : cherche aussi les alias et renvoie le jeton de la survivante", async () => {
    query.mockResolvedValueOnce({ rows: [{ publicToken: "RBLOY_SURVIVANTE1" }] });
    await expect(resolveLoyaltyCardToken("org_1", "rbloy_ALIASALIAS22")).resolves.toBe("RBLOY_SURVIVANTE1");
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("mergedIntoCardId");
    expect(params).toEqual(["RBLOY_ALIASALIAS22", "org_1"]);
  });

  it("code court : alias inclus, ambiguïté mesurée sur les survivantes distinctes", async () => {
    query.mockResolvedValueOnce({ rows: [{ publicToken: "RBLOY_SURVIVANTE1" }] });
    await expect(resolveLoyaltyCardToken("org_1", "E4FB")).resolves.toBe("RBLOY_SURVIVANTE1");
    const [sql] = query.mock.calls[0];
    expect(sql).toMatch(/SELECT DISTINCT lc\."publicToken"/);
    expect(sql).toContain("al.status IN ('ACTIVE', 'MERGED')");
    query.mockResolvedValueOnce({ rows: [{ publicToken: "RBLOY_A" }, { publicToken: "RBLOY_B" }] });
    await expect(resolveLoyaltyCardToken("org_1", "E4FB")).rejects.toThrow("CARD_AMBIGUOUS");
    query.mockResolvedValueOnce({ rows: [] });
    await expect(resolveLoyaltyCardToken("org_1", "E4FB")).rejects.toThrow("CARD_NOT_FOUND");
  });

  it("aucune lecture par jeton ne filtre encore directement status = 'ACTIVE' sans suivre l'alias", () => {
    const root = process.cwd();
    const files = [
      ...readdirSync(path.join(root, "src/lib/loyalty")).map((name) => path.join("src/lib/loyalty", name)),
      "src/lib/push/customer-push.ts",
    ].filter((file) => file.endsWith(".ts"));
    const offenders: string[] = [];
    for (const file of files) {
      if (file.endsWith("card-alias.ts") || file.endsWith("merge.ts")) continue;
      const source = readFileSync(path.join(root, file), "utf8");
      // Filtre direct sur le jeton ET status = 'ACTIVE' de la même carte : l'alias ne serait pas suivi.
      for (const match of source.matchAll(/(\w+)\."publicToken" = \$1[^`]*?\1\.status = 'ACTIVE'/g)) {
        offenders.push(`${file}: ${match[0].slice(0, 80)}`);
      }
      for (const match of source.matchAll(/WHERE\s+"publicToken" = \$1[^`]*?status = 'ACTIVE'/g)) {
        offenders.push(`${file}: ${match[0].slice(0, 80)}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
