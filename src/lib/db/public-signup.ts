import type { PoolClient } from "pg";
import { generateSignupPin, hashPassword } from "@/lib/auth/crypto";
import { pool } from "@/lib/db/pool";
import { bindPublicInstitute } from "@/lib/db/tenant-context";
import { normalizeLoginPhone } from "@/lib/auth/login-identifier";
import { isUserEmailUniqueViolation, lockEmailKey, normalizeEmail } from "@/lib/db/email-uniqueness";
import {
  PublicSignupError,
  createInstituteWithOwner,
  newId,
  resolveSignupPlan,
  splitPersonName,
} from "@/lib/db/institute-create";

export { PublicSignupError };

type PublicSignupInput = {
  personName: string;
  institut: string;
  email?: string;
  phone: string;
  city: string;
  address: string;
  website: string | null;
};

type PublicSignupCreated = {
  organizationId: string;
  email: string | null;
  phone: string;
  firstName: string;
  institut: string;
  temporaryPassword: string;
};

export async function createPublicSignup(input: PublicSignupInput): Promise<PublicSignupCreated> {
  const email = input.email?.trim() ? normalizeEmail(input.email) : null;
  const phone = normalizeLoginPhone(input.phone);
  if (!phone) throw new PublicSignupError("INVALID", "Indiquez un numéro WhatsApp valide.");
  const institut = input.institut.trim();
  const { firstName, lastName } = splitPersonName(input.personName);
  const temporaryPassword = generateSignupPin();
  const passwordHash = hashPassword(temporaryPassword);
  const plan = await resolveSignupPlan();

  const orgId = newId("org");
  const ownerId = newId("u");
  const now = new Date();

  // Avant la connexion : le contexte est posé à l'emprunt du client. Sans institut annoncé,
  // rappel_public échoue WITH CHECK sur Subscription, les réglages et l'Organization elle-même.
  bindPublicInstitute(orgId);
  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");
    const phoneCheck = await client.query(`SELECT id FROM "User" WHERE "loginPhone" = $1 LIMIT 1`, [phone]);
    if (phoneCheck.rows.length) throw new PublicSignupError("PHONE_TAKEN", "Ce numéro WhatsApp possède déjà un compte. Connectez-vous avec ce numéro.");

    // Vérification applicative (insensible à la casse et aux espaces de bord) dans la transaction ; sans e-mail
    // (inscription par téléphone) il n'y a rien à comparer.
    if (email) {
      await lockEmailKey(client, email);
      const { rows: emailCheck } = await client.query(
        `SELECT id FROM "User" WHERE LOWER(BTRIM(email)) = $1 LIMIT 1`,
        [email],
      );
      const { rows: platformCheck } = await client.query(
        `SELECT id FROM "PlatformUser" WHERE LOWER(BTRIM(email)) = $1 LIMIT 1`,
        [email],
      );
      if (emailCheck.length > 0 || platformCheck.length > 0) {
        throw new PublicSignupError(
          "EMAIL_TAKEN",
          "Cet e-mail a déjà un compte. Connectez-vous ou réinitialisez le mot de passe.",
        );
      }
    }

    await createInstituteWithOwner(client, {
      orgId,
      ownerId,
      institut,
      address: input.address.trim() || null,
      city: input.city.trim() || null,
      phone,
      email,
      website: input.website,
      owner: { firstName, lastName, email, phone, passwordHash, mustChangePassword: true, emailVerifiedAt: null },
      plan,
      now,
    });
    await client.query("COMMIT");

    return {
      organizationId: orgId,
      email,
      phone,
      firstName,
      institut,
      temporaryPassword,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    // Index d'unicité globale de l'e-mail (migration en attente) : même erreur métier que la vérification ci-dessus.
    if (isUserEmailUniqueViolation(error)) {
      throw new PublicSignupError(
        "EMAIL_TAKEN",
        "Cet e-mail a déjà un compte. Connectez-vous ou réinitialisez le mot de passe.",
      );
    }
    if (typeof error === "object" && error && "code" in error && error.code === "23505" && "constraint" in error && error.constraint === "User_loginPhone_key") {
      throw new PublicSignupError("PHONE_TAKEN", "Ce numéro WhatsApp possède déjà un compte.");
    }
    throw error;
  } finally {
    client.release();
  }
}
