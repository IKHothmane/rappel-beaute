import { randomBytes } from "crypto";
import { Pool, type PoolClient } from "pg";
import { writeAuditLog } from "@/lib/db/audit";
import type {
  CreatePackageInput,
  CreateRewardInput,
  CustomerLoyaltyView,
  LoyaltyAccountSummary,
  LoyaltyKpis,
  LoyaltyLevel,
  LoyaltyProgramConfig,
  LoyaltyRewardItem,
  LoyaltyTxnItem,
  PackageListItem,
  RedeemRewardInput,
  UpdateLoyaltyProgramInput,
} from "@/types/loyalty";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

function levelFromLifetime(
  lifetime: number,
  program: { bronzeMin: number; silverMin: number; goldMin: number; vipMin: number },
): LoyaltyLevel {
  if (lifetime >= program.vipMin) return "VIP";
  if (lifetime >= program.goldMin) return "GOLD";
  if (lifetime >= program.silverMin) return "SILVER";
  return "BRONZE";
}

export async function getOrCreateLoyaltyProgram(
  organizationId: string,
  client?: PoolClient,
): Promise<LoyaltyProgramConfig> {
  const c = client ?? pool;
  const existing = await c.query<{
    id: string;
    madPerPoint: string;
    bronzeMin: number;
    silverMin: number;
    goldMin: number;
    vipMin: number;
    active: boolean;
  }>(
    `SELECT id, "madPerPoint"::text, "bronzeMin", "silverMin", "goldMin", "vipMin", active
     FROM "LoyaltyProgram" WHERE "organizationId" = $1`,
    [organizationId],
  );
  if (existing.rows[0]) {
    const r = existing.rows[0];
    return {
      id: r.id,
      madPerPoint: parseFloat(r.madPerPoint) || 1,
      bronzeMin: r.bronzeMin,
      silverMin: r.silverMin,
      goldMin: r.goldMin,
      vipMin: r.vipMin,
      active: r.active,
    };
  }
  const id = newId("lprog");
  await c.query(
    `INSERT INTO "LoyaltyProgram" (
      id, "organizationId", "madPerPoint", "bronzeMin", "silverMin", "goldMin", "vipMin", active, "updatedAt"
    ) VALUES ($1,$2,1,0,1000,3000,6000,true,NOW())
    ON CONFLICT ("organizationId") DO NOTHING`,
    [id, organizationId],
  );
  return getOrCreateLoyaltyProgram(organizationId, client);
}

export async function updateLoyaltyProgram(
  organizationId: string,
  input: UpdateLoyaltyProgramInput,
  actor: { id: string; name?: string | null },
): Promise<LoyaltyProgramConfig> {
  const before = await getOrCreateLoyaltyProgram(organizationId);
  await pool.query(
    `UPDATE "LoyaltyProgram" SET
      "madPerPoint" = COALESCE($1, "madPerPoint"),
      "bronzeMin" = COALESCE($2, "bronzeMin"),
      "silverMin" = COALESCE($3, "silverMin"),
      "goldMin" = COALESCE($4, "goldMin"),
      "vipMin" = COALESCE($5, "vipMin"),
      active = COALESCE($6, active),
      "updatedAt" = NOW()
     WHERE "organizationId" = $7`,
    [
      input.madPerPoint ?? null,
      input.bronzeMin ?? null,
      input.silverMin ?? null,
      input.goldMin ?? null,
      input.vipMin ?? null,
      input.active ?? null,
      organizationId,
    ],
  );
  const after = await getOrCreateLoyaltyProgram(organizationId);
  await writeAuditLog({
    organizationId,
    actorId: actor.id,
    actorName: actor.name,
    entityType: "LoyaltyProgram",
    entityId: after.id,
    action: "UPDATE",
    before,
    after,
  });
  return after;
}

async function getOrCreateAccount(
  organizationId: string,
  customerId: string,
  client: PoolClient,
): Promise<{ id: string; balance: number; lifetimePoints: number; level: LoyaltyLevel }> {
  const existing = await client.query<{
    id: string;
    balance: number;
    lifetimePoints: number;
    level: string;
  }>(
    `SELECT id, balance, "lifetimePoints", level::text
     FROM "LoyaltyAccount"
     WHERE "organizationId" = $1 AND "customerId" = $2
     FOR UPDATE`,
    [organizationId, customerId],
  );
  if (existing.rows[0]) {
    return {
      id: existing.rows[0].id,
      balance: existing.rows[0].balance,
      lifetimePoints: existing.rows[0].lifetimePoints,
      level: existing.rows[0].level as LoyaltyLevel,
    };
  }
  const id = newId("lacc");
  await client.query(
    `INSERT INTO "LoyaltyAccount" (
      id, "organizationId", "customerId", balance, "lifetimePoints", level, "updatedAt"
    ) VALUES ($1,$2,$3,0,0,'BRONZE'::"LoyaltyLevel",NOW())`,
    [id, organizationId, customerId],
  );
  return { id, balance: 0, lifetimePoints: 0, level: "BRONZE" };
}

async function appendTxn(
  client: PoolClient,
  opts: {
    organizationId: string;
    accountId: string;
    customerId: string;
    type: "EARN" | "REDEEM" | "ADJUSTMENT" | "EXPIRE";
    points: number;
    balanceAfter: number;
    lifetimePoints: number;
    level: LoyaltyLevel;
    reason?: string | null;
    paymentId?: string | null;
    appointmentId?: string | null;
    rewardId?: string | null;
    redemptionId?: string | null;
    createdById?: string | null;
    idempotencyKey: string;
  },
): Promise<string> {
  const id = newId("ltxn");
  await client.query(
    `INSERT INTO "LoyaltyTransaction" (
      id, "organizationId", "accountId", "customerId", type, points, "balanceAfter",
      reason, "paymentId", "appointmentId", "rewardId", "redemptionId", "createdById", "idempotencyKey"
    ) VALUES (
      $1,$2,$3,$4,$5::"LoyaltyTxnType",$6,$7,$8,$9,$10,$11,$12,$13,$14
    )`,
    [
      id,
      opts.organizationId,
      opts.accountId,
      opts.customerId,
      opts.type,
      opts.points,
      opts.balanceAfter,
      opts.reason ?? null,
      opts.paymentId ?? null,
      opts.appointmentId ?? null,
      opts.rewardId ?? null,
      opts.redemptionId ?? null,
      opts.createdById ?? null,
      opts.idempotencyKey,
    ],
  );
  await client.query(
    `UPDATE "LoyaltyAccount" SET
      balance = $1,
      "lifetimePoints" = $2,
      level = $3::"LoyaltyLevel",
      "updatedAt" = NOW()
     WHERE id = $4`,
    [opts.balanceAfter, opts.lifetimePoints, opts.level, opts.accountId],
  );
  return id;
}

/**
 * Points sur montant payé (V1). Idempotent : earn:payment:{paymentId}
 */
export async function earnPointsFromPayment(opts: {
  organizationId: string;
  customerId: string;
  paymentId: string;
  amountMad: number;
  appointmentId?: string | null;
  userId?: string | null;
}): Promise<{ points: number; skipped: boolean }> {
  if (opts.amountMad <= 0) return { points: 0, skipped: true };
  const key = `earn:payment:${opts.paymentId}`;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const dup = await client.query(
      `SELECT 1 FROM "LoyaltyTransaction"
       WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
      [opts.organizationId, key],
    );
    if (dup.rows[0]) {
      await client.query("COMMIT");
      return { points: 0, skipped: true };
    }

    const program = await getOrCreateLoyaltyProgram(opts.organizationId, client);
    if (!program.active) {
      await client.query("COMMIT");
      return { points: 0, skipped: true };
    }

    const points = Math.floor(opts.amountMad / program.madPerPoint);
    if (points <= 0) {
      await client.query("COMMIT");
      return { points: 0, skipped: true };
    }

    const account = await getOrCreateAccount(
      opts.organizationId,
      opts.customerId,
      client,
    );
    const balanceAfter = account.balance + points;
    const lifetimePoints = account.lifetimePoints + points;
    const level = levelFromLifetime(lifetimePoints, program);

    await appendTxn(client, {
      organizationId: opts.organizationId,
      accountId: account.id,
      customerId: opts.customerId,
      type: "EARN",
      points,
      balanceAfter,
      lifetimePoints,
      level,
      reason: `Paiement ${opts.amountMad} MAD`,
      paymentId: opts.paymentId,
      appointmentId: opts.appointmentId ?? null,
      createdById: opts.userId ?? null,
      idempotencyKey: key,
    });

    await client.query("COMMIT");
    return { points, skipped: false };
  } catch (e) {
    await client.query("ROLLBACK");
    if (isUniqueViolation(e)) return { points: 0, skipped: true };
    throw e;
  } finally {
    client.release();
  }
}

/** Ajustement négatif proportionnel au remboursement — ne touche pas lifetimePoints en baisse sauf ADJUSTMENT explicite */
export async function adjustPointsForRefund(opts: {
  organizationId: string;
  customerId: string;
  refundPaymentId: string;
  refundAmount: number;
  originalPaymentAmount: number;
  userId?: string | null;
}): Promise<void> {
  if (opts.refundAmount <= 0 || !opts.customerId) return;
  const key = `refund:payment:${opts.refundPaymentId}`;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const dup = await client.query(
      `SELECT 1 FROM "LoyaltyTransaction"
       WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
      [opts.organizationId, key],
    );
    if (dup.rows[0]) {
      await client.query("COMMIT");
      return;
    }

    const program = await getOrCreateLoyaltyProgram(opts.organizationId, client);
    const pointsToRemove = Math.floor(opts.refundAmount / program.madPerPoint);
    if (pointsToRemove <= 0) {
      await client.query("COMMIT");
      return;
    }

    const account = await getOrCreateAccount(
      opts.organizationId,
      opts.customerId,
      client,
    );
    const delta = -Math.min(pointsToRemove, account.balance);
    if (delta === 0) {
      await client.query("COMMIT");
      return;
    }

    const balanceAfter = account.balance + delta;
    const lifetimePoints = Math.max(0, account.lifetimePoints + delta);
    const level = levelFromLifetime(lifetimePoints, program);

    await appendTxn(client, {
      organizationId: opts.organizationId,
      accountId: account.id,
      customerId: opts.customerId,
      type: "ADJUSTMENT",
      points: delta,
      balanceAfter,
      lifetimePoints,
      level,
      reason: "Remboursement cliente",
      paymentId: opts.refundPaymentId,
      createdById: opts.userId ?? null,
      idempotencyKey: key,
    });

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    if (isUniqueViolation(e)) return;
    throw e;
  } finally {
    client.release();
  }
}

export async function adjustLoyaltyPoints(
  organizationId: string,
  customerId: string,
  points: number,
  reason: string,
  actor: { id: string; name?: string | null },
): Promise<LoyaltyAccountSummary> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const program = await getOrCreateLoyaltyProgram(organizationId, client);
    const account = await getOrCreateAccount(organizationId, customerId, client);
    const balanceAfter = account.balance + points;
    if (balanceAfter < 0) throw new Error("INSUFFICIENT_POINTS");
    const lifetimePoints =
      points > 0
        ? account.lifetimePoints + points
        : Math.max(0, account.lifetimePoints + points);
    const level = levelFromLifetime(lifetimePoints, program);
    const key = `adj:${customerId}:${points}:${Date.now()}`;

    await appendTxn(client, {
      organizationId,
      accountId: account.id,
      customerId,
      type: "ADJUSTMENT",
      points,
      balanceAfter,
      lifetimePoints,
      level,
      reason,
      createdById: actor.id,
      idempotencyKey: key,
    });

    await writeAuditLog({
      organizationId,
      actorId: actor.id,
      actorName: actor.name,
      entityType: "LoyaltyAccount",
      entityId: account.id,
      action: "ADJUSTMENT",
      before: { balance: account.balance },
      after: { balance: balanceAfter, points, reason },
      client,
    });

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  const view = await getCustomerLoyalty(organizationId, customerId);
  if (!view.account) throw new Error("NOT_FOUND");
  return view.account;
}

export async function redeemReward(
  organizationId: string,
  input: RedeemRewardInput,
  actor: { id: string; name?: string | null },
): Promise<{ redemptionId: string; pointsSpent: number }> {
  const key =
    input.idempotencyKey ??
    `redeem:${input.customerId}:${input.rewardId}:${Date.now()}`;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const dup = await client.query<{ id: string; pointsSpent: number }>(
      `SELECT id, "pointsSpent" FROM "LoyaltyRedemption"
       WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
      [organizationId, key],
    );
    if (dup.rows[0]) {
      await client.query("COMMIT");
      return { redemptionId: dup.rows[0].id, pointsSpent: dup.rows[0].pointsSpent };
    }

    const reward = await client.query<{
      id: string;
      pointsCost: number;
      active: boolean;
      maxRedemptions: number | null;
      redemptionCount: number;
      name: string;
    }>(
      `SELECT id, "pointsCost", active, "maxRedemptions", "redemptionCount", name
       FROM "LoyaltyReward"
       WHERE id = $1 AND "organizationId" = $2
       FOR UPDATE`,
      [input.rewardId, organizationId],
    );
    if (!reward.rows[0]) throw new Error("REWARD_NOT_FOUND");
    if (!reward.rows[0].active) throw new Error("REWARD_INACTIVE");
    if (
      reward.rows[0].maxRedemptions != null &&
      reward.rows[0].redemptionCount >= reward.rows[0].maxRedemptions
    ) {
      throw new Error("REWARD_EXHAUSTED");
    }

    const program = await getOrCreateLoyaltyProgram(organizationId, client);
    const account = await getOrCreateAccount(organizationId, input.customerId, client);
    if (account.balance < reward.rows[0].pointsCost) throw new Error("INSUFFICIENT_POINTS");

    const redemptionId = newId("lred");
    const pointsSpent = reward.rows[0].pointsCost;
    const balanceAfter = account.balance - pointsSpent;
    const level = levelFromLifetime(account.lifetimePoints, program);

    await client.query(
      `INSERT INTO "LoyaltyRedemption" (
        id, "organizationId", "accountId", "customerId", "rewardId",
        "pointsSpent", status, "appointmentId", "idempotencyKey", "createdById"
      ) VALUES (
        $1,$2,$3,$4,$5,$6,'APPLIED'::"LoyaltyRedemptionStatus",$7,$8,$9
      )`,
      [
        redemptionId,
        organizationId,
        account.id,
        input.customerId,
        input.rewardId,
        pointsSpent,
        input.appointmentId ?? null,
        key,
        actor.id,
      ],
    );

    await appendTxn(client, {
      organizationId,
      accountId: account.id,
      customerId: input.customerId,
      type: "REDEEM",
      points: -pointsSpent,
      balanceAfter,
      lifetimePoints: account.lifetimePoints,
      level,
      reason: `Récompense : ${reward.rows[0].name}`,
      rewardId: input.rewardId,
      redemptionId,
      appointmentId: input.appointmentId ?? null,
      createdById: actor.id,
      idempotencyKey: `redeem-txn:${redemptionId}`,
    });

    await client.query(
      `UPDATE "LoyaltyReward"
       SET "redemptionCount" = "redemptionCount" + 1, "updatedAt" = NOW()
       WHERE id = $1`,
      [input.rewardId],
    );

    await writeAuditLog({
      organizationId,
      actorId: actor.id,
      actorName: actor.name,
      entityType: "LoyaltyRedemption",
      entityId: redemptionId,
      action: "REDEEM",
      after: { rewardId: input.rewardId, pointsSpent },
      client,
    });

    await client.query("COMMIT");
    return { redemptionId, pointsSpent };
  } catch (e) {
    await client.query("ROLLBACK");
    if (isUniqueViolation(e)) {
      const again = await pool.query<{ id: string; pointsSpent: number }>(
        `SELECT id, "pointsSpent" FROM "LoyaltyRedemption"
         WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
        [organizationId, key],
      );
      if (again.rows[0]) {
        return { redemptionId: again.rows[0].id, pointsSpent: again.rows[0].pointsSpent };
      }
    }
    throw e;
  } finally {
    client.release();
  }
}

export async function listLoyaltyLeaderboard(
  organizationId: string,
  limit = 40,
): Promise<{ kpis: LoyaltyKpis; ranking: LoyaltyAccountSummary[]; rewards: LoyaltyRewardItem[]; program: LoyaltyProgramConfig }> {
  const program = await getOrCreateLoyaltyProgram(organizationId);

  const [kpisRes, rankRes, rewards] = await Promise.all([
    pool.query<{
      membersCount: number;
      pointsDistributed: string;
      pointsRedeemed: string;
      rewardsUsed: number;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM "LoyaltyAccount" WHERE "organizationId" = $1 AND "lifetimePoints" > 0) AS "membersCount",
         COALESCE((SELECT SUM(points) FROM "LoyaltyTransaction" WHERE "organizationId" = $1 AND type = 'EARN'), 0)::text AS "pointsDistributed",
         COALESCE((SELECT SUM(ABS(points)) FROM "LoyaltyTransaction" WHERE "organizationId" = $1 AND type = 'REDEEM'), 0)::text AS "pointsRedeemed",
         (SELECT COUNT(*)::int FROM "LoyaltyRedemption" WHERE "organizationId" = $1 AND status = 'APPLIED') AS "rewardsUsed"`,
      [organizationId],
    ),
    pool.query<{
      id: string;
      customerId: string;
      firstName: string;
      lastName: string;
      balance: number;
      lifetimePoints: number;
      level: string;
      updatedAt: Date;
    }>(
      `SELECT la.id, la."customerId", c."firstName", c."lastName",
              la.balance, la."lifetimePoints", la.level::text, la."updatedAt"
       FROM "LoyaltyAccount" la
       JOIN "Customer" c ON c.id = la."customerId"
       WHERE la."organizationId" = $1 AND c."deletedAt" IS NULL
       ORDER BY la."lifetimePoints" DESC, la.balance DESC
       LIMIT $2`,
      [organizationId, limit],
    ),
    listRewards(organizationId, true),
  ]);

  return {
    program,
    kpis: {
      membersCount: kpisRes.rows[0]?.membersCount ?? 0,
      pointsDistributed: parseInt(kpisRes.rows[0]?.pointsDistributed ?? "0", 10) || 0,
      pointsRedeemed: parseInt(kpisRes.rows[0]?.pointsRedeemed ?? "0", 10) || 0,
      rewardsUsed: kpisRes.rows[0]?.rewardsUsed ?? 0,
    },
    ranking: rankRes.rows.map((r) => ({
      id: r.id,
      customerId: r.customerId,
      customerName: `${r.firstName} ${r.lastName}`.trim(),
      balance: r.balance,
      lifetimePoints: r.lifetimePoints,
      level: r.level as LoyaltyLevel,
      updatedAt: new Date(r.updatedAt).toISOString(),
    })),
    rewards,
  };
}

export async function getCustomerLoyalty(
  organizationId: string,
  customerId: string,
): Promise<CustomerLoyaltyView> {
  const program = await getOrCreateLoyaltyProgram(organizationId);
  const acc = await pool.query<{
    id: string;
    customerId: string;
    firstName: string;
    lastName: string;
    balance: number;
    lifetimePoints: number;
    level: string;
    updatedAt: Date;
  }>(
    `SELECT la.id, la."customerId", c."firstName", c."lastName",
            la.balance, la."lifetimePoints", la.level::text, la."updatedAt"
     FROM "LoyaltyAccount" la
     JOIN "Customer" c ON c.id = la."customerId"
     WHERE la."organizationId" = $1 AND la."customerId" = $2`,
    [organizationId, customerId],
  );

  const account: LoyaltyAccountSummary | null = acc.rows[0]
    ? {
        id: acc.rows[0].id,
        customerId: acc.rows[0].customerId,
        customerName: `${acc.rows[0].firstName} ${acc.rows[0].lastName}`.trim(),
        balance: acc.rows[0].balance,
        lifetimePoints: acc.rows[0].lifetimePoints,
        level: acc.rows[0].level as LoyaltyLevel,
        updatedAt: new Date(acc.rows[0].updatedAt).toISOString(),
      }
    : null;

  const balance = account?.balance ?? 0;

  const [todayRes, txns, rewards] = await Promise.all([
    pool.query<{ t: string }>(
      `SELECT COALESCE(SUM(points), 0)::text AS t FROM "LoyaltyTransaction"
       WHERE "organizationId" = $1 AND "customerId" = $2 AND type = 'EARN'
         AND "createdAt" >= date_trunc('day', NOW())`,
      [organizationId, customerId],
    ),
    pool.query<{
      id: string;
      type: string;
      points: number;
      balanceAfter: number;
      reason: string | null;
      paymentId: string | null;
      createdAt: Date;
    }>(
      `SELECT id, type::text, points, "balanceAfter", reason, "paymentId", "createdAt"
       FROM "LoyaltyTransaction"
       WHERE "organizationId" = $1 AND "customerId" = $2
       ORDER BY "createdAt" DESC LIMIT 20`,
      [organizationId, customerId],
    ),
    listRewards(organizationId, true),
  ]);

  const activeRewards = rewards
    .filter((r) => r.active)
    .sort((a, b) => a.pointsCost - b.pointsCost);
  const redeemable = activeRewards.filter((r) => r.pointsCost <= balance);
  const nextToUnlock = activeRewards.find((r) => r.pointsCost > balance) ?? null;

  return {
    account,
    todayEarned: parseInt(todayRes.rows[0]?.t ?? "0", 10) || 0,
    nextReward: nextToUnlock,
    pointsToNextReward: nextToUnlock ? nextToUnlock.pointsCost - balance : null,
    recentTxns: txns.rows.map(
      (t): LoyaltyTxnItem => ({
        id: t.id,
        type: t.type as LoyaltyTxnItem["type"],
        points: t.points,
        balanceAfter: t.balanceAfter,
        reason: t.reason,
        paymentId: t.paymentId,
        createdAt: new Date(t.createdAt).toISOString(),
      }),
    ),
    program,
    redeemableRewards: redeemable,
  };
}

export async function listRewards(
  organizationId: string,
  activeOnly = false,
): Promise<LoyaltyRewardItem[]> {
  const { rows } = await pool.query<{
    id: string;
    name: string;
    description: string | null;
    pointsCost: number;
    type: string;
    value: string | null;
    serviceId: string | null;
    active: boolean;
    maxRedemptions: number | null;
    redemptionCount: number;
  }>(
    `SELECT id, name, description, "pointsCost", type::text, value::text, "serviceId",
            active, "maxRedemptions", "redemptionCount"
     FROM "LoyaltyReward"
     WHERE "organizationId" = $1 ${activeOnly ? "AND active = true" : ""}
     ORDER BY "pointsCost" ASC`,
    [organizationId],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    pointsCost: r.pointsCost,
    type: r.type as LoyaltyRewardItem["type"],
    value: r.value != null ? parseFloat(r.value) : null,
    serviceId: r.serviceId,
    active: r.active,
    maxRedemptions: r.maxRedemptions,
    redemptionCount: r.redemptionCount,
  }));
}

export async function createReward(
  organizationId: string,
  input: CreateRewardInput,
  actor: { id: string; name?: string | null },
): Promise<LoyaltyRewardItem> {
  const id = newId("lrwd");
  await pool.query(
    `INSERT INTO "LoyaltyReward" (
      id, "organizationId", name, description, "pointsCost", type, value, "serviceId",
      active, "maxRedemptions", "redemptionCount", "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6::"LoyaltyRewardType",$7,$8,true,$9,0,NOW())`,
    [
      id,
      organizationId,
      input.name,
      input.description ?? null,
      input.pointsCost,
      input.type,
      input.value ?? null,
      input.serviceId ?? null,
      input.maxRedemptions ?? null,
    ],
  );
  await writeAuditLog({
    organizationId,
    actorId: actor.id,
    actorName: actor.name,
    entityType: "LoyaltyReward",
    entityId: id,
    action: "CREATE",
    after: input,
  });
  const list = await listRewards(organizationId);
  return list.find((r) => r.id === id)!;
}

/* ─── Packages / Forfaits ─────────────────────────────────────────── */

export async function createPackage(
  organizationId: string,
  input: CreatePackageInput,
  actor: { id: string; name?: string | null },
): Promise<PackageListItem> {
  const id = newId("pkg");
  const itemId = newId("pki");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO "Package" (
        id, "organizationId", "customerId", name, "serviceId",
        "sessionTotal", "sessionUsed", "pricePaid", status,
        "expiresAt", notes, "createdById", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5,$6,0,$7,'ACTIVE'::"PackageStatus",$8,$9,$10,NOW()
      )`,
      [
        id,
        organizationId,
        input.customerId,
        input.name,
        input.serviceId,
        input.sessionTotal,
        input.pricePaid,
        input.expiresAt ? new Date(input.expiresAt) : null,
        input.notes ?? null,
        actor.id,
      ],
    );
    await client.query(
      `INSERT INTO "PackageItem" (id, "packageId", "serviceId", "sessionTotal", "sessionUsed")
       VALUES ($1,$2,$3,$4,0)`,
      [itemId, id, input.serviceId, input.sessionTotal],
    );
    await writeAuditLog({
      organizationId,
      actorId: actor.id,
      actorName: actor.name,
      entityType: "Package",
      entityId: id,
      action: "CREATE",
      after: input,
      client,
    });
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  const detail = await getPackageById(organizationId, id);
  if (!detail) throw new Error("NOT_FOUND");
  return detail;
}

function mapPackage(r: Record<string, unknown>): PackageListItem {
  const total = Number(r.sessionTotal) || 0;
  const used = Number(r.sessionUsed) || 0;
  return {
    id: String(r.id),
    customerId: String(r.customerId),
    customerName: `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim(),
    name: String(r.name),
    serviceId: (r.serviceId as string) ?? null,
    serviceName: (r.serviceName as string) ?? null,
    sessionTotal: total,
    sessionUsed: used,
    sessionRemaining: Math.max(0, total - used),
    pricePaid: parseFloat(String(r.pricePaid)) || 0,
    status: r.status as PackageListItem["status"],
    purchasedAt: new Date(r.purchasedAt as Date).toISOString(),
    expiresAt: r.expiresAt ? new Date(r.expiresAt as Date).toISOString() : null,
  };
}

export async function listPackages(
  organizationId: string,
  opts?: { customerId?: string; status?: string },
): Promise<PackageListItem[]> {
  const conditions = [`p."organizationId" = $1`];
  const params: unknown[] = [organizationId];
  let pi = 2;
  if (opts?.customerId) {
    conditions.push(`p."customerId" = $${pi}`);
    params.push(opts.customerId);
    pi++;
  }
  if (opts?.status) {
    conditions.push(`p.status = $${pi}::"PackageStatus"`);
    params.push(opts.status);
    pi++;
  }
  const { rows } = await pool.query(
    `SELECT p.id, p."customerId", p.name, p."serviceId", p."sessionTotal", p."sessionUsed",
            p."pricePaid"::text, p.status::text, p."purchasedAt", p."expiresAt",
            c."firstName", c."lastName", s.name AS "serviceName"
     FROM "Package" p
     JOIN "Customer" c ON c.id = p."customerId"
     LEFT JOIN "Service" s ON s.id = p."serviceId"
     WHERE ${conditions.join(" AND ")}
     ORDER BY p."purchasedAt" DESC`,
    params,
  );
  return rows.map((r) => mapPackage(r as Record<string, unknown>));
}

export async function getPackageById(
  organizationId: string,
  packageId: string,
): Promise<PackageListItem | null> {
  const { rows } = await pool.query(
    `SELECT p.id, p."customerId", p.name, p."serviceId", p."sessionTotal", p."sessionUsed",
            p."pricePaid"::text, p.status::text, p."purchasedAt", p."expiresAt",
            c."firstName", c."lastName", s.name AS "serviceName"
     FROM "Package" p
     JOIN "Customer" c ON c.id = p."customerId"
     LEFT JOIN "Service" s ON s.id = p."serviceId"
     WHERE p.id = $1 AND p."organizationId" = $2`,
    [packageId, organizationId],
  );
  if (!rows[0]) return null;
  return mapPackage(rows[0] as Record<string, unknown>);
}

/**
 * Consomme 1 séance du forfait actif matching service — idempotent apt:{id}:package
 */
export async function consumePackageSessionForAppointment(opts: {
  organizationId: string;
  appointmentId: string;
  customerId: string;
  serviceId: string;
}): Promise<{ consumed: boolean; packageId?: string }> {
  const key = `apt:${opts.appointmentId}:package`;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const dup = await client.query(
      `SELECT 1 FROM "PackageSession"
       WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
      [opts.organizationId, key],
    );
    if (dup.rows[0]) {
      await client.query("COMMIT");
      return { consumed: false };
    }

    const pkg = await client.query<{ id: string; sessionUsed: number; sessionTotal: number }>(
      `SELECT id, "sessionUsed", "sessionTotal"
       FROM "Package"
       WHERE "organizationId" = $1 AND "customerId" = $2 AND "serviceId" = $3
         AND status = 'ACTIVE'::"PackageStatus"
         AND "sessionUsed" < "sessionTotal"
         AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
       ORDER BY "purchasedAt" ASC
       LIMIT 1
       FOR UPDATE`,
      [opts.organizationId, opts.customerId, opts.serviceId],
    );
    if (!pkg.rows[0]) {
      await client.query("COMMIT");
      return { consumed: false };
    }

    const packageId = pkg.rows[0].id;
    const used = pkg.rows[0].sessionUsed + 1;
    const exhausted = used >= pkg.rows[0].sessionTotal;

    await client.query(
      `INSERT INTO "PackageSession" (
        id, "organizationId", "packageId", "appointmentId", "idempotencyKey"
      ) VALUES ($1,$2,$3,$4,$5)`,
      [newId("pks"), opts.organizationId, packageId, opts.appointmentId, key],
    );

    await client.query(
      `UPDATE "Package" SET
        "sessionUsed" = $1,
        status = CASE WHEN $2 THEN 'EXHAUSTED'::"PackageStatus" ELSE status END,
        "updatedAt" = NOW()
       WHERE id = $3`,
      [used, exhausted, packageId],
    );

    await client.query(
      `UPDATE "PackageItem" SET "sessionUsed" = "sessionUsed" + 1
       WHERE "packageId" = $1 AND "serviceId" = $2 AND "sessionUsed" < "sessionTotal"`,
      [packageId, opts.serviceId],
    );

    await client.query("COMMIT");
    return { consumed: true, packageId };
  } catch (e) {
    await client.query("ROLLBACK");
    if (isUniqueViolation(e)) return { consumed: false };
    throw e;
  } finally {
    client.release();
  }
}
