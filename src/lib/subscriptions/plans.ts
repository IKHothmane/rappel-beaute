import { Pool } from "pg";
import type { PlanCode, PlanDto } from "@/types/subscription";
import { parsePlanFeatures } from "@/lib/subscriptions/features";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type PlanRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: string;
  currency: string;
  billingInterval: "MONTHLY" | "YEARLY";
  maxStaff: number | null;
  maxCustomers: number | null;
  maxAppointmentsPerMonth: number | null;
  maxResources: number | null;
  trialDays: number;
  active: boolean;
  features: unknown;
};

function mapPlan(row: PlanRow): PlanDto {
  return {
    id: row.id,
    code: row.code as PlanCode,
    name: row.name,
    description: row.description,
    price: parseFloat(row.price),
    currency: row.currency,
    billingInterval: row.billingInterval,
    maxStaff: row.maxStaff,
    maxCustomers: row.maxCustomers,
    maxAppointmentsPerMonth: row.maxAppointmentsPerMonth,
    maxResources: row.maxResources,
    trialDays: row.trialDays,
    active: row.active,
    features: parsePlanFeatures(row.features),
  };
}

export async function listPlans(activeOnly = true): Promise<PlanDto[]> {
  const { rows } = await pool.query<PlanRow>(
    `SELECT id, code, name, description, price::text, currency, "billingInterval",
            "maxStaff", "maxCustomers", "maxAppointmentsPerMonth", "maxResources",
            "trialDays", active, features
     FROM "Plan"
     ${activeOnly ? `WHERE active = true` : ""}
     ORDER BY price ASC`,
  );
  return rows.map(mapPlan);
}

export async function getPlanById(id: string): Promise<PlanDto | null> {
  const { rows } = await pool.query<PlanRow>(
    `SELECT id, code, name, description, price::text, currency, "billingInterval",
            "maxStaff", "maxCustomers", "maxAppointmentsPerMonth", "maxResources",
            "trialDays", active, features
     FROM "Plan" WHERE id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ? mapPlan(rows[0]) : null;
}

export async function getPlanByCode(code: PlanCode | string): Promise<PlanDto | null> {
  const { rows } = await pool.query<PlanRow>(
    `SELECT id, code, name, description, price::text, currency, "billingInterval",
            "maxStaff", "maxCustomers", "maxAppointmentsPerMonth", "maxResources",
            "trialDays", active, features
     FROM "Plan" WHERE code = $1 LIMIT 1`,
    [code.toUpperCase()],
  );
  return rows[0] ? mapPlan(rows[0]) : null;
}

export async function countSubscriptionsUsingPlan(planId: string): Promise<number> {
  const { rows } = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM "Subscription" WHERE "planId" = $1`,
    [planId],
  );
  return parseInt(rows[0]?.c ?? "0", 10);
}

export async function updatePlan(
  id: string,
  patch: Partial<{
    name: string;
    description: string | null;
    price: number;
    maxStaff: number | null;
    maxCustomers: number | null;
    maxAppointmentsPerMonth: number | null;
    maxResources: number | null;
    active: boolean;
    features: Record<string, boolean>;
  }>,
): Promise<PlanDto | null> {
  const current = await getPlanById(id);
  if (!current) return null;

  const { rows } = await pool.query<PlanRow>(
    `UPDATE "Plan" SET
      name = COALESCE($2, name),
      description = COALESCE($3, description),
      price = COALESCE($4, price),
      "maxStaff" = COALESCE($5, "maxStaff"),
      "maxCustomers" = COALESCE($6, "maxCustomers"),
      "maxAppointmentsPerMonth" = COALESCE($7, "maxAppointmentsPerMonth"),
      "maxResources" = COALESCE($8, "maxResources"),
      active = COALESCE($9, active),
      features = COALESCE($10::jsonb, features),
      "updatedAt" = NOW()
     WHERE id = $1
     RETURNING id, code, name, description, price::text, currency, "billingInterval",
               "maxStaff", "maxCustomers", "maxAppointmentsPerMonth", "maxResources",
               "trialDays", active, features`,
    [
      id,
      patch.name,
      patch.description,
      patch.price,
      patch.maxStaff,
      patch.maxCustomers,
      patch.maxAppointmentsPerMonth,
      patch.maxResources,
      patch.active,
      patch.features ? JSON.stringify(patch.features) : null,
    ],
  );
  return rows[0] ? mapPlan(rows[0]) : null;
}

export async function deactivatePlan(id: string): Promise<void> {
  const used = await countSubscriptionsUsingPlan(id);
  if (used > 0) {
    await pool.query(`UPDATE "Plan" SET active = false, "updatedAt" = NOW() WHERE id = $1`, [id]);
    return;
  }
  await pool.query(`UPDATE "Plan" SET active = false, "updatedAt" = NOW() WHERE id = $1`, [id]);
}
