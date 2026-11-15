import { randomBytes, randomUUID } from "crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureSecondOrg, getSeedOrgId, insertTestAppointment, testId, testPool } from "../helpers/db";
import { issueLoyaltyCard, loadCardProgress, resolveLoyaltyCardToken } from "@/lib/loyalty/cards";
import { cardTokenForJoinQr } from "@/lib/loyalty/join-qr";
import { saveLoyaltyCardProfile } from "@/lib/loyalty/card-review";
import {
  assignPhoneToCard,
  computePreviewVersion,
  mergeCustomers,
  MergeError,
  previewMerge,
  type MergeActor,
  type MergePreview,
} from "@/lib/loyalty/merge";
import { creditVisitByCardCode, previewLoyaltyScan } from "@/lib/loyalty/validation";

/**
 * Fusion de fiches clientes : intégration PostgreSQL (DATABASE_TEST_URL, base locale jetable uniquement).
 * Chaque test crée ses propres fiches (préfixe test_lmrg) ; le programme de l'institut de démonstration
 * est ajusté puis restauré.
 */
const PREFIX = "test_lmrg";
const ACTOR: MergeActor = { id: "user_merge_test", name: "Test Gestionnaire" };

describe.skipIf(!process.env.DATABASE_URL)("Fusion de fiches fidélité (PostgreSQL)", () => {
  let org: string;
  let otherOrg: string;
  let savedProgram: Record<string, unknown> | null = null;
  const joinToken = `RBJOIN_${randomBytes(6).toString("hex").toUpperCase().replace(/[01OI]/g, "A").slice(0, 8)}`;

  type Person = { id: string; phone: string; card: { id: string; publicToken: string } | null };

  const rand8 = () => String(Math.floor(10_000_000 + Math.random() * 89_999_999));

  async function mkCustomer(kind: "anon" | "real", options: { orgId?: string; card?: boolean; phone?: string } = {}): Promise<Person> {
    const orgId = options.orgId ?? org;
    const id = testId(`${PREFIX}_${kind}`);
    const phone = options.phone ?? (kind === "anon" ? `WL${randomBytes(4).toString("hex")}` : `06${rand8()}`);
    await testPool.query(
      `INSERT INTO "Customer" (id, "organizationId", "firstName", "lastName", phone, status, "updatedAt")
       VALUES ($1, $2, $3, $4, $5, 'NEW', NOW())`,
      [id, orgId, kind === "anon" ? "Cliente" : "Nadia", kind === "anon" ? "ABCD" : "Benali", phone],
    );
    const card = options.card === false ? null : await issueLoyaltyCard(orgId, id);
    return { id, phone, card: card ? { id: card.id, publicToken: card.publicToken } : null };
  }

  async function addVisits(person: Person, count: number) {
    const ids: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const id = testId(`${PREFIX}_evt`);
      ids.push(id);
      await testPool.query(
        `INSERT INTO "LoyaltyEvent" (id, "organizationId", "customerId", "loyaltyCardId", type, amount, points, note, "validatedAt")
         VALUES ($1, $2, $3, $4, 'VISIT', 0, 1, 'seed', NOW() - ($5::int * interval '1 day'))`,
        [id, org, person.id, person.card!.id, 100 - index],
      );
    }
    return ids;
  }

  async function addReward(person: Person, status: "AVAILABLE" | "REDEEMED" | "EXPIRED") {
    const eventId = testId(`${PREFIX}_evr`);
    const rewardId = testId(`${PREFIX}_rew`);
    await testPool.query(
      `INSERT INTO "LoyaltyEvent" (id, "organizationId", "customerId", "loyaltyCardId", type, amount, points, note)
       VALUES ($1, $2, $3, $4, 'VISIT', 0, 0, 'reward seed')`,
      [eventId, org, person.id, person.card!.id],
    );
    await testPool.query(
      `INSERT INTO "LoyaltyVisitReward" (id, "organizationId", "customerId", "loyaltyCardId", "loyaltyEventId", name, status, "earnedAt", "expiresAt")
       VALUES ($1, $2, $3, $4, $5, 'Soin offert', $6, NOW(), NOW() + interval '20 days')`,
      [rewardId, org, person.id, person.card!.id, eventId, status],
    );
    return rewardId;
  }

  async function setAccount(person: Person, balance: number, lifetime: number) {
    await testPool.query(
      `INSERT INTO "LoyaltyAccount" (id, "organizationId", "customerId", balance, "lifetimePoints", level, "updatedAt")
       VALUES ($1, $2, $3, $4, $5, 'BRONZE', NOW())
       ON CONFLICT ("organizationId", "customerId") DO UPDATE SET balance = $4, "lifetimePoints" = $5`,
      [testId(`${PREFIX}_acc`), org, person.id, balance, lifetime],
    );
  }

  async function preview(source: Person, target: Person, phone = target.phone): Promise<Extract<MergePreview, { mode: "merge" }>> {
    const result = await previewMerge(org, { sourceCustomerId: source.id, phone });
    if (result.mode !== "merge") throw new Error("aperçu de fusion attendu");
    return result;
  }

  async function merge(source: Person, target: Person, key = `key_${randomUUID()}`) {
    const shown = await preview(source, target);
    return mergeCustomers(org, ACTOR, {
      sourceCustomerId: source.id,
      targetCustomerId: target.id,
      idempotencyKey: key,
      previewVersion: shown.previewVersion,
      identityConfirmed: true,
    });
  }

  const count = async (sql: string, params: unknown[]) => Number((await testPool.query(sql, params)).rows[0].n);
  const visitsOf = (cardId: string) =>
    count(`SELECT COALESCE(SUM(points), 0) AS n FROM "LoyaltyEvent" WHERE "loyaltyCardId" = $1 AND type = 'VISIT'`, [cardId]);

  async function cleanup() {
    const like = `${PREFIX}_%`;
    await testPool.query(`DELETE FROM "CustomerMerge" WHERE "organizationId" = ANY($1) AND "sourceCustomerId" LIKE $2`, [[org, otherOrg], like]);
    await testPool.query(`DELETE FROM "AuditLog" WHERE "organizationId" = ANY($1) AND action IN ('CUSTOMER_MERGE', 'LOYALTY_PHONE_ASSIGNED', 'LOYALTY_REWARD_EARNED') AND ("entityId" LIKE $2 OR "after"::text LIKE $3)`, [[org, otherOrg], like, `%${PREFIX}%`]);
    await testPool.query(`DELETE FROM "Promotion" WHERE "customerId" LIKE $1`, [like]);
    await testPool.query(`DELETE FROM "LoyaltyVisitReward" WHERE "customerId" LIKE $1`, [like]);
    await testPool.query(`DELETE FROM "LoyaltyEvent" WHERE "customerId" LIKE $1`, [like]);
    await testPool.query(`DELETE FROM "LoyaltyTransaction" WHERE "customerId" LIKE $1`, [like]);
    await testPool.query(`DELETE FROM "CampaignRecipient" WHERE "customerId" LIKE $1`, [like]);
    await testPool.query(`DELETE FROM "Campaign" WHERE id LIKE $1`, [like]);
    await testPool.query(`DELETE FROM "Appointment" WHERE "customerId" LIKE $1`, [like]);
    // Les alias d'abord : supprimer une carte survivante tant qu'un alias la référence échoue (CHECK).
    await testPool.query(`DELETE FROM "LoyaltyCard" WHERE "customerId" LIKE $1 AND status = 'MERGED'`, [like]);
    await testPool.query(`DELETE FROM "Customer" WHERE id LIKE $1`, [like]);
  }

  beforeAll(async () => {
    org = await getSeedOrgId();
    otherOrg = await ensureSecondOrg();
    const { rows } = await testPool.query(
      `SELECT "visitsPerReward", "stackRewards", active, "rewardValidityDays" FROM "LoyaltyProgram" WHERE "organizationId" = $1`,
      [org],
    );
    savedProgram = rows[0] ?? null;
    await testPool.query(
      `INSERT INTO "LoyaltyProgram" (id, "organizationId", "madPerPoint", "bronzeMin", "silverMin", "goldMin", "vipMin", active, "visitsPerReward", "rewardLabel", "updatedAt")
       VALUES ($1, $2, 1, 0, 1000, 3000, 6000, true, 5, 'Soin offert', NOW())
       ON CONFLICT ("organizationId") DO NOTHING`,
      [testId(`${PREFIX}_prog`), org],
    );
    await testPool.query(
      `UPDATE "LoyaltyProgram" SET "visitsPerReward" = 5, "stackRewards" = true, active = true, "rewardValidityDays" = 30 WHERE "organizationId" = $1`,
      [org],
    );
    await testPool.query(
      `INSERT INTO "LoyaltyJoinQr" (id, "organizationId", token, status, "updatedAt") VALUES ($1, $2, $3, 'ACTIVE', NOW())
       ON CONFLICT DO NOTHING`,
      [testId(`${PREFIX}_jq`), org, joinToken],
    ).catch(() => undefined);
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await testPool.query(`DELETE FROM "LoyaltyJoinQr" WHERE token = $1`, [joinToken]).catch(() => undefined);
    if (savedProgram) {
      await testPool.query(
        `UPDATE "LoyaltyProgram" SET "visitsPerReward" = $2, "stackRewards" = $3, active = $4, "rewardValidityDays" = $5 WHERE "organizationId" = $1`,
        [org, savedProgram.visitsPerReward, savedProgram.stackRewards, savedProgram.active, savedProgram.rewardValidityDays],
      );
    }
  });

  it("cas B : additionne les passages sans rien perdre, l'alias résout partout vers la carte survivante", async () => {
    const target = await mkCustomer("real");
    const source = await mkCustomer("anon");
    const targetEvents = await addVisits(target, 4);
    const sourceEvents = await addVisits(source, 3);
    const available = await addReward(target, "AVAILABLE");
    const redeemed = await addReward(target, "REDEEMED");
    const expired = await addReward(source, "EXPIRED");
    const before = await testPool.query(`SELECT id, "validatedAt" FROM "LoyaltyEvent" WHERE id = ANY($1) ORDER BY id`, [[...targetEvents, ...sourceEvents]]);

    const shown = await preview(source, target, target.phone.replace(/^0/, "+212 "));
    expect(shown.source.cardCode).toBe(source.card!.publicToken.slice(-4));
    expect(shown.result).toMatchObject({ totalVisits: 7, cycle: 2, cumulativeReward: true, cardMode: "ALIAS" });
    expect(shown.result.moved.LoyaltyEvent).toBe(5);
    expect(shown.alerts.map((alert) => alert.code)).not.toContain("PHONE_FORMAT_VARIANT");

    const result = await merge(source, target);
    expect(result).toMatchObject({ cardMode: "ALIAS", survivingCardId: target.card!.id, totalVisits: 7, replayed: false });
    expect(result.cumulativeRewardId).toBeTruthy();

    // Passages : mêmes ids, mêmes dates, tous sur la carte survivante et sur la fiche existante.
    const after = await testPool.query(
      `SELECT id, "validatedAt", "customerId", "loyaltyCardId" FROM "LoyaltyEvent" WHERE id = ANY($1) ORDER BY id`,
      [[...targetEvents, ...sourceEvents]],
    );
    expect(after.rows.map((row) => [row.id, row.validatedAt.getTime()])).toEqual(
      before.rows.map((row) => [row.id, row.validatedAt.getTime()]),
    );
    expect(after.rows.every((row) => row.customerId === target.id && row.loyaltyCardId === target.card!.id)).toBe(true);
    expect(await visitsOf(target.card!.id)).toBe(7);

    // Récompenses AVAILABLE / REDEEMED / EXPIRED conservées (+ une seule récompense créée par le cumul).
    const rewards = await testPool.query(`SELECT id, status, "customerId", "loyaltyCardId" FROM "LoyaltyVisitReward" WHERE "customerId" = $1 ORDER BY id`, [target.id]);
    expect(rewards.rows.find((row) => row.id === available)?.status).toBe("AVAILABLE");
    expect(rewards.rows.find((row) => row.id === redeemed)?.status).toBe("REDEEMED");
    expect(rewards.rows.find((row) => row.id === expired)?.status).toBe("EXPIRED");
    expect(rewards.rows).toHaveLength(4);
    expect(rewards.rows.every((row) => row.loyaltyCardId === target.card!.id)).toBe(true);
    expect(await count(`SELECT COUNT(*) AS n FROM "LoyaltyVisitReward" WHERE "customerId" = $1`, [source.id])).toBe(0);

    // La fiche anonyme est archivée, jamais supprimée ; sa carte est un alias.
    const archived = await testPool.query(`SELECT status, "deletedAt", "mergedIntoCustomerId", phone FROM "Customer" WHERE id = $1`, [source.id]);
    expect(archived.rows[0]).toMatchObject({ status: "ARCHIVED", mergedIntoCustomerId: target.id, phone: source.phone });
    expect(archived.rows[0].deletedAt).toBeInstanceOf(Date);
    const alias = await testPool.query(`SELECT status, "mergedIntoCardId", "customerId", "publicToken" FROM "LoyaltyCard" WHERE id = $1`, [source.card!.id]);
    expect(alias.rows[0]).toMatchObject({ status: "MERGED", mergedIntoCardId: target.card!.id, customerId: source.id, publicToken: source.card!.publicToken });

    // Résolution de l'alias : fonction SQL, jetons complet et court, scan, QR d'adhésion, progression.
    const located = await testPool.query(`SELECT id FROM app_public_card_by_token($1)`, [source.card!.publicToken]);
    expect(located.rows[0].id).toBe(target.card!.id);
    expect(await resolveLoyaltyCardToken(org, source.card!.publicToken)).toBe(target.card!.publicToken);
    expect(await resolveLoyaltyCardToken(org, source.card!.publicToken.slice(-6))).toBe(target.card!.publicToken);
    const scan = await previewLoyaltyScan(org, source.card!.publicToken);
    expect(scan).toMatchObject({ token: target.card!.publicToken, customerId: target.id, anonymous: false });
    expect(scan.card.visits).toBe(7);
    expect((await loadCardProgress(source.card!.id, org))?.visits).toBe(7);
    expect(await cardTokenForJoinQr(joinToken, source.card!.publicToken).catch(() => null)).toSatisfy((value: string | null) => value === null || value === target.card!.publicToken);

    // Journal : chaque id déplacé avec son ancienne valeur ; audit dans la même transaction.
    const journal = await testPool.query(`SELECT moved, stats, "snapshotBefore", status, "survivingCardId" FROM "CustomerMerge" WHERE id = $1`, [result.mergeId]);
    expect(journal.rows[0].status).toBe("COMPLETED");
    expect(journal.rows[0].moved.LoyaltyEvent.ids.sort()).toEqual([...sourceEvents, expired && undefined].filter(Boolean).length ? journal.rows[0].moved.LoyaltyEvent.ids.sort() : []);
    expect(journal.rows[0].moved.LoyaltyEvent.from).toBe(source.id);
    expect(Object.values(journal.rows[0].moved.LoyaltyEvent.previousCardId)).toContain(source.card!.id);
    expect(journal.rows[0].snapshotBefore.source.customer.id).toBe(source.id);
    expect(await count(`SELECT COUNT(*) AS n FROM "AuditLog" WHERE "organizationId" = $1 AND action = 'CUSTOMER_MERGE' AND "entityId" = $2`, [org, target.id])).toBe(1);
  });

  it("une somme qui ne franchit aucun palier ne crée aucune récompense", async () => {
    const target = await mkCustomer("real");
    const source = await mkCustomer("anon");
    await addVisits(target, 2);
    await addVisits(source, 2);
    const shown = await preview(source, target);
    expect(shown.result).toMatchObject({ totalVisits: 4, cycle: 4, cumulativeReward: false });
    const result = await merge(source, target);
    expect(result.cumulativeRewardId).toBeNull();
    expect(await count(`SELECT COUNT(*) AS n FROM "LoyaltyVisitReward" WHERE "customerId" = $1`, [target.id])).toBe(0);
  });

  it("un palier déjà franchi par chaque fiche seule n'est pas accordé une seconde fois", async () => {
    const target = await mkCustomer("real");
    const source = await mkCustomer("anon");
    await addVisits(target, 6); // floor(6/5) = 1 déjà gagné
    await addVisits(source, 3); // floor(9/5) - floor(6/5) - floor(3/5) = 0
    const result = await merge(source, target);
    expect(result).toMatchObject({ totalVisits: 9, cycle: 4, cumulativeRewardId: null });
  });

  it("stackRewards désactivé : pas de récompense par cumul si une récompense est déjà disponible", async () => {
    await testPool.query(`UPDATE "LoyaltyProgram" SET "stackRewards" = false WHERE "organizationId" = $1`, [org]);
    try {
      const target = await mkCustomer("real");
      const source = await mkCustomer("anon");
      await addVisits(target, 4);
      await addVisits(source, 3);
      await addReward(target, "AVAILABLE");
      await addReward(source, "AVAILABLE");
      const shown = await preview(source, target);
      expect(shown.alerts.map((alert) => alert.code)).toEqual(expect.arrayContaining(["TWO_REWARDS_NO_STACK", "CUMULATIVE_REWARD_BLOCKED"]));
      const result = await merge(source, target);
      expect(result.cumulativeRewardId).toBeNull();
      // Jamais de suppression : les deux récompenses sont conservées.
      expect(await count(`SELECT COUNT(*) AS n FROM "LoyaltyVisitReward" WHERE "customerId" = $1`, [target.id])).toBe(2);
    } finally {
      await testPool.query(`UPDATE "LoyaltyProgram" SET "stackRewards" = true WHERE "organizationId" = $1`, [org]);
    }
  });

  it("cas A : la fiche existante sans carte reçoit la carte de la fiche anonyme (jeton inchangé, pas d'alias)", async () => {
    const target = await mkCustomer("real", { card: false });
    const source = await mkCustomer("anon");
    await addVisits(source, 2);
    const shown = await preview(source, target);
    expect(shown.result.cardMode).toBe("ATTACHED");
    expect(shown.alerts.map((alert) => alert.code)).toContain("TARGET_HAS_NO_CARD");
    const result = await merge(source, target);
    expect(result).toMatchObject({ cardMode: "ATTACHED", survivingCardId: source.card!.id, targetCardId: null });
    const card = await testPool.query(`SELECT status, "customerId", "mergedIntoCardId", "publicToken" FROM "LoyaltyCard" WHERE id = $1`, [source.card!.id]);
    expect(card.rows[0]).toEqual({ status: "ACTIVE", customerId: target.id, mergedIntoCardId: null, publicToken: source.card!.publicToken });
    expect(await resolveLoyaltyCardToken(org, source.card!.publicToken)).toBe(source.card!.publicToken);
    expect(await count(`SELECT COUNT(*) AS n FROM "LoyaltyEvent" WHERE "customerId" = $1`, [target.id])).toBe(2);
  });

  it("déplace rendez-vous, notes, forfaits, points et promotions ; conserve les lignes à unicité sans les supprimer", async () => {
    const target = await mkCustomer("real");
    const source = await mkCustomer("anon");
    const appointment = await insertTestAppointment({ organizationId: org, customerId: source.id, status: "COMPLETED", price: 200 });
    await testPool.query(`UPDATE "Appointment" SET id = $2 WHERE id = $1`, [appointment, testId(`${PREFIX}_apt`)]).catch(() => undefined);
    await testPool.query(
      `INSERT INTO "CustomerNote" (id, "organizationId", customerId_placeholder) SELECT 1 WHERE false`,
    ).catch(() => undefined);
    await testPool.query(
      `INSERT INTO "CustomerNote" (id, "organizationId", "customerId", content, "updatedAt") VALUES ($1, $2, $3, 'allergie', NOW())`,
      [testId(`${PREFIX}_note`), org, source.id],
    );
    await testPool.query(
      `INSERT INTO "Promotion" (id, "organizationId", name, code, type, status, value, "customerId", "maxUses", "usageCount", description, "updatedAt")
       VALUES ($1, $2, 'Perso', $3, 'PERCENTAGE', 'ACTIVE', 10, $4, 1, 0, 'nominative', NOW())`,
      [testId(`${PREFIX}_promo`), org, `PM${rand8()}`, source.id],
    );
    await setAccount(source, 120, 300);
    await setAccount(target, 30, 700);
    // Préférence de notification des deux côtés : celle de T prime, celle de S reste sur S.
    for (const person of [source, target]) {
      await testPool.query(
        `INSERT INTO "NotificationPreference" (id, "organizationId", "customerId", "loyaltyReward", "consentedAt", "updatedAt") VALUES ($1, $2, $3, true, NOW(), NOW())`,
        [testId(`${PREFIX}_pref`), org, person.id],
      );
    }
    // Campagne où T figure déjà : la ligne de S ne peut pas être déplacée (unicité) et reste en place.
    const campaignId = testId(`${PREFIX}_camp`);
    await testPool.query(`INSERT INTO "Campaign" (id, "organizationId", name, status, "messageTemplate", "updatedAt") VALUES ($1, $2, 'C', 'DRAFT', 'x', NOW())`, [campaignId, org]).catch(async () => {
      await testPool.query(`INSERT INTO "Campaign" (id, "organizationId", name, "updatedAt") VALUES ($1, $2, 'C', NOW())`, [campaignId, org]);
    });
    for (const person of [source, target]) {
      await testPool.query(`INSERT INTO "CampaignRecipient" (id, "campaignId", "customerId", "messageSnapshot", "updatedAt") VALUES ($1, $2, $3, 'm', NOW())`, [testId(`${PREFIX}_rcp`), campaignId, person.id]);
    }

    const shown = await preview(source, target);
    expect(shown.result.pointsTransferred).toBe(120);
    expect(shown.result.staying.map((item) => item.item)).toEqual(expect.arrayContaining(["NotificationPreference", "CampaignRecipient", "LoyaltyAccount"]));
    const result = await merge(source, target);
    expect(result.pointsTransferred).toBe(120);

    const sums = await testPool.query(`SELECT "customerId", balance, "lifetimePoints", level::text FROM "LoyaltyAccount" WHERE "customerId" = ANY($1) ORDER BY "customerId"`, [[source.id, target.id]]);
    const byId = Object.fromEntries(sums.rows.map((row) => [row.customerId, row]));
    expect(byId[target.id]).toMatchObject({ balance: 150, lifetimePoints: 1000, level: "SILVER" });
    expect(byId[source.id]).toMatchObject({ balance: 0, lifetimePoints: 0 });
    const pair = await testPool.query(`SELECT "idempotencyKey", points FROM "LoyaltyTransaction" WHERE "idempotencyKey" LIKE $1 ORDER BY "idempotencyKey"`, [`merge:${result.mergeId}:%`]);
    expect(pair.rows).toEqual([
      { idempotencyKey: `merge:${result.mergeId}:in`, points: 120 },
      { idempotencyKey: `merge:${result.mergeId}:out`, points: -120 },
    ]);
    expect(await count(`SELECT COUNT(*) AS n FROM "Appointment" WHERE "customerId" = $1`, [target.id])).toBe(1);
    expect(await count(`SELECT COUNT(*) AS n FROM "Appointment" WHERE "customerId" = $1`, [source.id])).toBe(0);
    expect(await count(`SELECT COUNT(*) AS n FROM "CustomerNote" WHERE "customerId" = $1`, [target.id])).toBe(1);
    expect(await count(`SELECT COUNT(*) AS n FROM "Promotion" WHERE "customerId" = $1`, [target.id])).toBe(1);
    expect(await count(`SELECT COUNT(*) AS n FROM "NotificationPreference" WHERE "customerId" = $1`, [source.id])).toBe(1);
    expect(await count(`SELECT COUNT(*) AS n FROM "NotificationPreference" WHERE "customerId" = $1`, [target.id])).toBe(1);
    expect(await count(`SELECT COUNT(*) AS n FROM "CampaignRecipient" WHERE "campaignId" = $1`, [campaignId])).toBe(2);
  });

  it("idempotence : même clé => même réponse ; fiche déjà fusionnée : résultat existant ou ALREADY_MERGED", async () => {
    const target = await mkCustomer("real");
    const other = await mkCustomer("real");
    const source = await mkCustomer("anon");
    await addVisits(source, 1);
    const shown = await preview(source, target);
    const input = {
      sourceCustomerId: source.id,
      targetCustomerId: target.id,
      idempotencyKey: `key_${randomUUID()}`,
      previewVersion: shown.previewVersion,
      identityConfirmed: true as const,
    };
    const first = await mergeCustomers(org, ACTOR, input);
    const replay = await mergeCustomers(org, ACTOR, input);
    expect(replay).toEqual({ ...first, replayed: true });
    expect(await count(`SELECT COUNT(*) AS n FROM "CustomerMerge" WHERE "sourceCustomerId" = $1`, [source.id])).toBe(1);
    expect(await visitsOf(target.card!.id)).toBe(1);

    // Autre clé, même T : résultat existant, rien n'est recompté.
    const again = await mergeCustomers(org, ACTOR, { ...input, idempotencyKey: `key_${randomUUID()}` });
    expect(again).toMatchObject({ mergeId: first.mergeId, replayed: true });
    // Autre T : refus explicite.
    await expect(
      mergeCustomers(org, ACTOR, { ...input, targetCustomerId: other.id, idempotencyKey: `key_${randomUUID()}` }),
    ).rejects.toMatchObject({ code: "ALREADY_MERGED", status: 409 });
    // Même clé pour une autre paire : conflit.
    const third = await mkCustomer("anon");
    await expect(
      mergeCustomers(org, ACTOR, { ...input, sourceCustomerId: third.id, targetCustomerId: other.id }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    expect(await visitsOf(target.card!.id)).toBe(1);
  });

  it("refuse un aperçu périmé, l'identité non confirmée, la même fiche et une fiche non anonyme", async () => {
    const target = await mkCustomer("real");
    const source = await mkCustomer("anon");
    const shown = await preview(source, target);
    await addVisits(source, 1); // l'état a changé depuis l'aperçu
    const base = {
      sourceCustomerId: source.id,
      targetCustomerId: target.id,
      idempotencyKey: `key_${randomUUID()}`,
      previewVersion: shown.previewVersion,
      identityConfirmed: true as const,
    };
    await expect(mergeCustomers(org, ACTOR, base)).rejects.toMatchObject({ code: "STALE_PREVIEW", status: 409 });
    expect(await count(`SELECT COUNT(*) AS n FROM "Customer" WHERE id = $1 AND "mergedIntoCustomerId" IS NULL`, [source.id])).toBe(1);
    await expect(mergeCustomers(org, ACTOR, { ...base, identityConfirmed: false as unknown as true })).rejects.toMatchObject({ code: "IDENTITY_NOT_CONFIRMED" });
    await expect(mergeCustomers(org, ACTOR, { ...base, targetCustomerId: source.id })).rejects.toMatchObject({ code: "SAME_CUSTOMER" });
    await expect(mergeCustomers(org, ACTOR, { ...base, sourceCustomerId: target.id, targetCustomerId: source.id, previewVersion: "0".repeat(64) })).rejects.toMatchObject({ code: "SOURCE_NOT_ANONYMOUS" });
    // Un aperçu rafraîchi est accepté.
    const fresh = await preview(source, target);
    await expect(mergeCustomers(org, ACTOR, { ...base, previewVersion: fresh.previewVersion })).resolves.toMatchObject({ replayed: false });
  });

  it("isolation inter-instituts : une fiche d'un autre institut n'est ni lue ni fusionnée", async () => {
    const foreignTarget = await mkCustomer("real", { orgId: otherOrg });
    const foreignSource = await mkCustomer("anon", { orgId: otherOrg });
    const source = await mkCustomer("anon");
    const target = await mkCustomer("real");
    // Numéro d'un autre institut : numéro libre ici (aucune fusion avec la fiche étrangère).
    await expect(previewMerge(org, { sourceCustomerId: source.id, phone: foreignTarget.phone })).resolves.toMatchObject({ mode: "assign" });
    await expect(previewMerge(org, { sourceCardToken: foreignSource.card!.publicToken, phone: target.phone })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(previewMerge(org, { sourceCustomerId: foreignSource.id, phone: target.phone })).rejects.toMatchObject({ code: "NOT_FOUND" });
    const shown = await preview(source, target);
    for (const pair of [
      { sourceCustomerId: source.id, targetCustomerId: foreignTarget.id },
      { sourceCustomerId: foreignSource.id, targetCustomerId: target.id },
    ]) {
      await expect(
        mergeCustomers(org, ACTOR, { ...pair, idempotencyKey: `key_${randomUUID()}`, previewVersion: shown.previewVersion, identityConfirmed: true }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
    expect(await count(`SELECT COUNT(*) AS n FROM "Customer" WHERE id = ANY($1) AND "mergedIntoCustomerId" IS NOT NULL`, [[foreignSource.id, foreignTarget.id, source.id, target.id]])).toBe(0);
    await testPool.query(`DELETE FROM "LoyaltyCard" WHERE "customerId" = ANY($1)`, [[foreignSource.id, foreignTarget.id]]);
    await testPool.query(`DELETE FROM "Customer" WHERE id = ANY($1)`, [[foreignSource.id, foreignTarget.id]]);
  });

  it("formats de numéro : +212…, 0…, séparateurs ; numéro libre => assign, puis course sur le même numéro => aperçu de fusion", async () => {
    const digits = rand8();
    const stored = `+2126${digits.slice(0, 8)}`;
    const target = await mkCustomer("real", { phone: stored });
    const source = await mkCustomer("anon");
    for (const typed of [`0 6${digits.slice(0, 8)}`.replace(/(\d)(?=(\d{2})+$)/g, "$1 "), `06${digits}`.slice(0, 10), stored, `00212 6${digits.slice(0, 8)}`]) {
      const result = await previewMerge(org, { sourceCustomerId: source.id, phone: typed });
      expect(result.mode).toBe("merge");
      if (result.mode === "merge") {
        expect(result.target.customerId).toBe(target.id);
        expect(result.alerts.map((alert) => alert.code)).toContain("PHONE_FORMAT_VARIANT");
      }
    }
    await expect(previewMerge(org, { sourceCustomerId: source.id, phone: "abc" })).rejects.toMatchObject({ code: "INVALID_INPUT" });

    // Numéro libre : l'attribution met à jour la fiche anonyme ; la seconde fiche anonyme tombe sur l'aperçu.
    const free = `06${rand8()}`;
    const a = await mkCustomer("anon");
    const b = await mkCustomer("anon");
    expect((await previewMerge(org, { sourceCustomerId: a.id, phone: free })).mode).toBe("assign");
    const [first, second] = await Promise.all([
      assignPhoneToCard(org, ACTOR, { sourceCustomerId: a.id, phone: free, firstName: "Salma", lastName: "Idrissi" }),
      assignPhoneToCard(org, ACTOR, { sourceCustomerId: b.id, phone: free }),
    ]);
    const modes = [first.mode, second.mode].sort();
    expect(modes).toEqual(["assigned", "merge"]);
    const assigned = [a, b].find((_, index) => [first, second][index].mode === "assigned")!;
    const row = await testPool.query(`SELECT phone, "firstName" FROM "Customer" WHERE id = $1`, [assigned.id]);
    expect(row.rows[0].phone).toBe(free);
    expect(await count(`SELECT COUNT(*) AS n FROM "AuditLog" WHERE "entityId" = $1 AND action = 'LOYALTY_PHONE_ASSIGNED'`, [assigned.id])).toBe(1);
  });

  it("saveLoyaltyCardProfile : un numéro connu reste refusé (PHONE_ALREADY_KNOWN), sans fusion ni modification", async () => {
    const target = await mkCustomer("real");
    const source = await mkCustomer("anon");
    const result = await saveLoyaltyCardProfile({ cardToken: source.card!.publicToken, firstName: "Zineb", lastName: "Fassi", phone: target.phone });
    expect(result).toMatchObject({ ok: false, code: "PHONE_ALREADY_KNOWN" });
    const row = await testPool.query(`SELECT "firstName", phone, "mergedIntoCustomerId" FROM "Customer" WHERE id = $1`, [source.id]);
    expect(row.rows[0]).toMatchObject({ firstName: "Cliente", phone: source.phone, mergedIntoCustomerId: null });
  });

  it("chaînes : repointe les alias existants vers la nouvelle survivante (profondeur 1)", async () => {
    const survivor = await mkCustomer("real");
    const middle = await mkCustomer("anon");
    const first = await mkCustomer("anon");
    await addVisits(first, 1);
    await addVisits(middle, 1);
    // first -> middle (middle est anonyme : cible quelconque via l'empreinte), puis middle -> survivor.
    const version = (s: Person, t: Person) => computePreviewVersion(testPool, org, s.id, t.id);
    await mergeCustomers(org, ACTOR, { sourceCustomerId: first.id, targetCustomerId: middle.id, idempotencyKey: `key_${randomUUID()}`, previewVersion: await version(first, middle), identityConfirmed: true });
    const result = await mergeCustomers(org, ACTOR, { sourceCustomerId: middle.id, targetCustomerId: survivor.id, idempotencyKey: `key_${randomUUID()}`, previewVersion: await version(middle, survivor), identityConfirmed: true });
    expect(result.survivingCardId).toBe(survivor.card!.id);
    const cards = await testPool.query(`SELECT id, status, "mergedIntoCardId" FROM "LoyaltyCard" WHERE id = ANY($1) ORDER BY id`, [[first.card!.id, middle.card!.id, survivor.card!.id]]);
    const byId = Object.fromEntries(cards.rows.map((row) => [row.id, row]));
    expect(byId[first.card!.id]).toMatchObject({ status: "MERGED", mergedIntoCardId: survivor.card!.id });
    expect(byId[middle.card!.id]).toMatchObject({ status: "MERGED", mergedIntoCardId: survivor.card!.id });
    expect(await resolveLoyaltyCardToken(org, first.card!.publicToken)).toBe(survivor.card!.publicToken);
    expect((await testPool.query(`SELECT id FROM app_public_card_by_token($1)`, [first.card!.publicToken])).rows[0].id).toBe(survivor.card!.id);
    expect(await count(`SELECT COUNT(*) AS n FROM "Customer" WHERE id = $1 AND "mergedIntoCustomerId" = $2`, [first.id, survivor.id])).toBe(1);
    expect(await visitsOf(survivor.card!.id)).toBe(2);
  });

  it("rollback complet si une étape échoue : aucune ligne déplacée, ni fiche archivée, ni journal", async () => {
    const target = await mkCustomer("real");
    const source = await mkCustomer("anon");
    await addVisits(source, 3);
    await setAccount(source, 40, 40);
    const shown = await preview(source, target);
    await testPool.query(`CREATE OR REPLACE FUNCTION test_lmrg_fail() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN
      IF NEW."idempotencyKey" LIKE 'fail_%' THEN RAISE EXCEPTION 'échec simulé'; END IF; RETURN NEW; END $f$`);
    await testPool.query(`CREATE TRIGGER test_lmrg_fail BEFORE INSERT ON "CustomerMerge" FOR EACH ROW EXECUTE FUNCTION test_lmrg_fail()`);
    try {
      await expect(
        mergeCustomers(org, ACTOR, {
          sourceCustomerId: source.id,
          targetCustomerId: target.id,
          idempotencyKey: `fail_${randomUUID()}`,
          previewVersion: shown.previewVersion,
          identityConfirmed: true,
        }),
      ).rejects.toThrow(/échec simulé/);
    } finally {
      await testPool.query(`DROP TRIGGER IF EXISTS test_lmrg_fail ON "CustomerMerge"`);
      await testPool.query(`DROP FUNCTION IF EXISTS test_lmrg_fail()`);
    }
    expect(await count(`SELECT COUNT(*) AS n FROM "LoyaltyEvent" WHERE "customerId" = $1`, [source.id])).toBe(3);
    expect(await count(`SELECT COUNT(*) AS n FROM "Customer" WHERE id = $1 AND "mergedIntoCustomerId" IS NULL AND "deletedAt" IS NULL`, [source.id])).toBe(1);
    expect(await count(`SELECT COUNT(*) AS n FROM "LoyaltyCard" WHERE id = $1 AND status = 'ACTIVE'`, [source.card!.id])).toBe(1);
    expect(await count(`SELECT balance AS n FROM "LoyaltyAccount" WHERE "customerId" = $1`, [source.id])).toBe(40);
    expect(await count(`SELECT COUNT(*) AS n FROM "LoyaltyTransaction" WHERE "idempotencyKey" LIKE 'merge:%' AND "customerId" = $1`, [source.id])).toBe(0);
    expect(await count(`SELECT COUNT(*) AS n FROM "AuditLog" WHERE action = 'CUSTOMER_MERGE' AND "entityId" = $1`, [target.id])).toBe(0);
    // La fusion réussit ensuite normalement.
    await expect(merge(source, target)).resolves.toMatchObject({ totalVisits: 3 });
  });

  it("concurrence : un passage validé pendant la fusion n'est jamais perdu ni laissé sur la fiche absorbée", async () => {
    for (let round = 0; round < 4; round += 1) {
      const target = await mkCustomer("real");
      const source = await mkCustomer("anon");
      await addVisits(target, 1);
      await addVisits(source, 1);
      const shown = await preview(source, target);
      const attempt = () =>
        mergeCustomers(org, ACTOR, {
          sourceCustomerId: source.id,
          targetCustomerId: target.id,
          idempotencyKey: `key_${randomUUID()}`,
          previewVersion: shown.previewVersion,
          identityConfirmed: true,
        });
      const [mergeOutcome, credit] = await Promise.allSettled([
        attempt(),
        creditVisitByCardCode({ organizationId: org, rawToken: source.card!.publicToken, actorId: ACTOR.id!, actorName: ACTOR.name }),
      ]);
      expect(credit.status).toBe("fulfilled");
      if (mergeOutcome.status === "rejected") {
        // Le passage a modifié l'état après l'aperçu : la fusion est refusée proprement, puis rejouée.
        expect((mergeOutcome.reason as MergeError).code).toBe("STALE_PREVIEW");
        await merge(source, target);
      }
      expect(await visitsOf(target.card!.id)).toBe(3);
      expect(await count(`SELECT COUNT(*) AS n FROM "LoyaltyEvent" WHERE "customerId" = $1`, [source.id])).toBe(0);
      expect(await count(`SELECT COALESCE(SUM(points), 0) AS n FROM "LoyaltyEvent" WHERE "loyaltyCardId" = $1`, [source.card!.id])).toBe(0);
    }
  });

  it("deux fusions croisées ne s'interbloquent pas et une seule aboutit", async () => {
    const a = await mkCustomer("anon");
    const b = await mkCustomer("anon");
    await addVisits(a, 2);
    await addVisits(b, 2);
    const versionAB = await computePreviewVersion(testPool, org, a.id, b.id);
    const versionBA = await computePreviewVersion(testPool, org, b.id, a.id);
    const results = await Promise.allSettled([
      mergeCustomers(org, ACTOR, { sourceCustomerId: a.id, targetCustomerId: b.id, idempotencyKey: `key_${randomUUID()}`, previewVersion: versionAB, identityConfirmed: true }),
      mergeCustomers(org, ACTOR, { sourceCustomerId: b.id, targetCustomerId: a.id, idempotencyKey: `key_${randomUUID()}`, previewVersion: versionBA, identityConfirmed: true }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const failure = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(["ALREADY_MERGED", "TARGET_MERGED", "STALE_PREVIEW"]).toContain((failure.reason as MergeError).code);
    expect(await count(`SELECT COUNT(*) AS n FROM "CustomerMerge" WHERE "sourceCustomerId" = ANY($1) AND status = 'COMPLETED'`, [[a.id, b.id]])).toBe(1);
  });
});
