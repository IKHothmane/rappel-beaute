import { randomBytes } from "crypto";
import type { PoolClient } from "pg";
import { newInstituteTrialEnd } from "@/lib/subscriptions/subscription-service";
import { getPlanByCode, listPlans } from "@/lib/subscriptions/plans";

export class PublicSignupError extends Error {
  constructor(
    public code: "EMAIL_TAKEN" | "PHONE_TAKEN" | "PLAN_NOT_FOUND" | "INVALID",
    message: string,
  ) {
    super(message);
    this.name = "PublicSignupError";
  }
}

export function newId(prefix: string) {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

export function splitPersonName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "Propriétaire";
  const lastName = parts.slice(1).join(" ") || firstName;
  return { firstName, lastName };
}

export function slugifyInstitut(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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

export async function resolveSignupPlan() {
  const preferred = await getPlanByCode("INSTITUT");
  if (preferred?.active) return preferred;
  const plans = await listPlans(true);
  const first = plans[0];
  if (!first) throw new PublicSignupError("PLAN_NOT_FOUND", "Aucune formule disponible.");
  return first;
}

export async function seedOrgDefaults(client: PoolClient, organizationId: string) {
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

export type InstituteOwnerInput = {
  firstName: string;
  lastName: string;
  email: string | null;
  /** Téléphone de contact ; sert aussi d'identifiant de connexion WhatsApp (User.loginPhone). */
  phone: string;
  /**
   * Identifiant de connexion par téléphone (User.loginPhone). Par défaut : `phone`. NULL quand la connexion par
   * téléphone est désactivée (AUTH_PHONE_LOGIN_ENABLED faux) : le numéro reste un contact, pas un identifiant.
   */
  loginPhone?: string | null;
  /** NULL pour un compte Google : aucun mot de passe tant que l'utilisateur n'en définit pas un. */
  passwordHash: string | null;
  mustChangePassword: boolean;
  /** Renseigné seulement si l'e-mail a été vérifié par un tiers de confiance (Google). */
  emailVerifiedAt: Date | null;
};

export type CreateInstituteInput = {
  orgId: string;
  ownerId: string;
  institut: string;
  address: string | null;
  city: string | null;
  phone: string;
  email: string | null;
  website: string | null;
  owner: InstituteOwnerInput;
  plan: { id: string; price: number | string; currency: string };
  now?: Date;
};

const SLUG_ATTEMPTS = 6;

function isSlugCollision(error: unknown): boolean {
  if (typeof error !== "object" || !error) return false;
  const e = error as { code?: string; constraint?: string };
  return e.code === "23505" && (e.constraint === undefined || /slug/i.test(e.constraint));
}

/**
 * Organisation + propriétaire OWNER + abonnement TRIAL + réglages par défaut, dans la transaction ouverte
 * par l'appelant (BEGIN/COMMIT/ROLLBACK lui appartiennent). Les contrôles d'unicité de l'e-mail et du
 * téléphone, propres à chaque parcours, restent chez l'appelant et se font dans la même transaction.
 * Un conflit de slug concurrent (23505) est rejoué sur un SAVEPOINT avec un nouveau suffixe.
 */
export async function createInstituteWithOwner(
  client: PoolClient,
  input: CreateInstituteInput,
): Promise<{ organizationId: string; ownerId: string; slug: string }> {
  const now = input.now ?? new Date();
  const trialEnd = newInstituteTrialEnd(now);
  const base = slugifyInstitut(input.institut);
  let slug = await uniqueSlug(client, base);

  for (let attempt = 0; ; attempt++) {
    await client.query("SAVEPOINT institute_slug");
    try {
      await client.query(
        `INSERT INTO "Organization" (
          id, name, slug, address, city, phone, email, website, status, "updatedAt"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ACTIVE',NOW())`,
        [input.orgId, input.institut, slug, input.address, input.city, input.phone, input.email, input.website],
      );
      await client.query("RELEASE SAVEPOINT institute_slug");
      break;
    } catch (error) {
      if (!isSlugCollision(error) || attempt + 1 >= SLUG_ATTEMPTS) throw error;
      await client.query("ROLLBACK TO SAVEPOINT institute_slug");
      slug = `${base}-${randomBytes(3).toString("hex")}`;
    }
  }

  const owner = input.owner;
  // La colonne emailVerifiedAt n'est référencée que pour un e-mail vérifié : l'inscription par téléphone
  // reste indépendante de la migration d'authentification.
  const verified = owner.emailVerifiedAt != null;
  await client.query(
    `INSERT INTO "User" (
      id, "organizationId", email, "firstName", "lastName", phone, role, status, "loginPhone",
      "passwordHash", "mustChangePassword", "updatedAt"${verified ? ', "emailVerifiedAt"' : ""}
    ) VALUES ($1,$2,$3,$4,$5,$6,'OWNER','ACTIVE',$7,$8,$9,NOW()${verified ? ",$10" : ""})`,
    [
      input.ownerId,
      input.orgId,
      owner.email,
      owner.firstName,
      owner.lastName,
      owner.phone,
      owner.loginPhone === undefined ? owner.phone : owner.loginPhone,
      owner.passwordHash,
      owner.mustChangePassword,
      ...(verified ? [owner.emailVerifiedAt] : []),
    ],
  );

  await client.query(
    `INSERT INTO "Subscription" (
      id, "organizationId", "planId", status, "priceSnapshot", "currencySnapshot",
      "startedAt", "currentPeriodStart", "currentPeriodEnd", "trialEndsAt", "updatedAt"
    ) VALUES ($1,$2,$3,'TRIAL',$4,$5,$6,$6,$7,$7,NOW())`,
    [newId("sub"), input.orgId, input.plan.id, input.plan.price, input.plan.currency, now, trialEnd],
  );

  await seedOrgDefaults(client, input.orgId);
  return { organizationId: input.orgId, ownerId: input.ownerId, slug };
}
