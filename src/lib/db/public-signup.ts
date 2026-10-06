import { randomBytes } from "crypto";
import type { PoolClient } from "pg";
import { generateSignupPin, hashPassword } from "@/lib/auth/crypto";
import { pool } from "@/lib/db/pool";
import { addMonths } from "@/lib/subscriptions/subscription-service";
import { getPlanByCode, listPlans } from "@/lib/subscriptions/plans";

export class PublicSignupError extends Error {
  constructor(
    public code: "EMAIL_TAKEN" | "PLAN_NOT_FOUND" | "INVALID",
    message: string,
  ) {
    super(message);
    this.name = "PublicSignupError";
  }
}

export type PublicSignupInput = {
  personName: string;
  institut: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  website: string | null;
};

export type PublicSignupCreated = {
  organizationId: string;
  email: string;
  firstName: string;
  institut: string;
  temporaryPassword: string;
};

function newId(prefix: string) {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

function splitPersonName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "Propriétaire";
  const lastName = parts.slice(1).join(" ") || firstName;
  return { firstName, lastName };
}

function slugifyInstitut(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "institut";
}

async function uniqueSlug(client: PoolClient, base: string): Promise<string> {
  let slug = base;
  for (let i = 0; i < 12; i++) {
    const { rows } = await client.query(`SELECT 1 FROM "Organization" WHERE slug = $1 LIMIT 1`, [
      slug,
    ]);
    if (rows.length === 0) return slug;
    slug = `${base}-${randomBytes(2).toString("hex")}`;
  }
  throw new PublicSignupError("INVALID", "Impossible de générer un identifiant d'institut.");
}

async function resolveSignupPlan() {
  const preferred = await getPlanByCode("INSTITUT");
  if (preferred?.active) return preferred;
  const plans = await listPlans(true);
  const first = plans[0];
  if (!first) throw new PublicSignupError("PLAN_NOT_FOUND", "Aucune formule disponible.");
  return first;
}

async function seedOrgDefaults(client: PoolClient, organizationId: string) {
  await client.query(
    `INSERT INTO "ReactivationSettings" (id, "organizationId", "updatedAt")
     VALUES ($1, $2, NOW()) ON CONFLICT ("organizationId") DO NOTHING`,
    [newId("rset"), organizationId],
  );
  await client.query(
    `INSERT INTO "ReviewSettings" (id, "organizationId", "updatedAt")
     VALUES ($1, $2, NOW()) ON CONFLICT ("organizationId") DO NOTHING`,
    [newId("rvset"), organizationId],
  );
  await client.query(
    `INSERT INTO "LoyaltyProgram" (id, "organizationId", "updatedAt")
     VALUES ($1, $2, NOW()) ON CONFLICT ("organizationId") DO NOTHING`,
    [newId("loy"), organizationId],
  );
}

export async function createPublicSignup(input: PublicSignupInput): Promise<PublicSignupCreated> {
  const email = input.email.trim().toLowerCase();
  const institut = input.institut.trim();
  const { firstName, lastName } = splitPersonName(input.personName);
  const temporaryPassword = generateSignupPin();
  const passwordHash = hashPassword(temporaryPassword);
  const plan = await resolveSignupPlan();

  const orgId = newId("org");
  const ownerId = newId("u");
  const subId = newId("sub");
  const now = new Date();
  const periodEnd = addMonths(now, 1);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: emailCheck } = await client.query(
      `SELECT id FROM "User" WHERE LOWER(email) = $1 LIMIT 1`,
      [email],
    );
    const { rows: platformCheck } = await client.query(
      `SELECT id FROM "PlatformUser" WHERE LOWER(email) = $1 LIMIT 1`,
      [email],
    );
    if (emailCheck.length > 0 || platformCheck.length > 0) {
      throw new PublicSignupError(
        "EMAIL_TAKEN",
        "Cet e-mail a déjà un compte. Connectez-vous ou réinitialisez le mot de passe.",
      );
    }

    const slug = await uniqueSlug(client, slugifyInstitut(institut));

    await client.query(
      `INSERT INTO "Organization" (
        id, name, slug, address, city, phone, email, website, status, "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ACTIVE',NOW())`,
      [
        orgId,
        institut,
        slug,
        input.address.trim() || null,
        input.city.trim() || null,
        input.phone.trim(),
        email,
        input.website,
      ],
    );

    await client.query(
      `INSERT INTO "User" (
        id, "organizationId", email, "firstName", "lastName", phone, role, status,
        "passwordHash", "mustChangePassword", "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,'OWNER','ACTIVE',$7,true,NOW())`,
      [ownerId, orgId, email, firstName, lastName, input.phone.trim() || null, passwordHash],
    );

    await client.query(
      `INSERT INTO "Subscription" (
        id, "organizationId", "planId", status, "priceSnapshot", "currencySnapshot",
        "startedAt", "currentPeriodStart", "currentPeriodEnd", "updatedAt"
      ) VALUES ($1,$2,$3,'ACTIVE',$4,$5,$6,$6,$7,NOW())`,
      [subId, orgId, plan.id, plan.price, plan.currency, now, periodEnd],
    );

    await seedOrgDefaults(client, orgId);
    await client.query("COMMIT");

    return {
      organizationId: orgId,
      email,
      firstName,
      institut,
      temporaryPassword,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deletePublicSignupOrganization(organizationId: string): Promise<void> {
  await pool.query(`DELETE FROM "Organization" WHERE id = $1`, [organizationId]);
}
