import type { NextRequest } from "next/server";
import { publicRoute } from "@/lib/http/route-scope";
import { clientIp } from "@/lib/http/client-ip";
import { logger } from "@/lib/logger";
import { consumeDimensions, emailKey, RATE_POLICIES } from "@/lib/rate-limit";
import { hashPasswordAsync } from "@/lib/auth/crypto";
import { checkPasswordPolicy, PASSWORD_POLICY_MESSAGES } from "@/lib/auth/password-policy";
import { checkJsonSameOrigin, jsonNoStore } from "@/lib/auth/google-http";
import { scheduleEmailSignup } from "@/lib/auth/email-auth-tasks";
import {
  GENERIC_EMAIL_SENT,
  authBusy,
  badRequest,
  isAuthBusy,
  parseEmailInput,
  readJsonObject,
  stringField,
  tooManyRequests,
} from "@/lib/auth/auth-route-utils";
import { PROFESSIONAL_SIGNUP_LIMITS as L } from "@/lib/validation/professional-signup";

/**
 * POST /api/auth/signup/email/ (JSON {email, password, name, hp}) : première étape de l'inscription par e-mail
 * vérifié. AUCUNE organisation, aucun abonnement ni aucun User n'est créé : une inscription en attente (mot de passe
 * haché scrypt, jamais en clair) et un jeton de vérification haché sont enregistrés, puis le lien est envoyé.
 *
 * Anti-énumération : la réponse (statut, corps, durée) est IDENTIQUE que l'adresse soit nouvelle, déjà inscrite
 * (compte institut : e-mail « vous avez déjà un compte », rien n'est créé), ou celle d'un administrateur de la
 * plateforme (refus silencieux). La recherche, les écritures et l'envoi se font après la réponse. Seules les
 * erreurs de forme (adresse, nom, mot de passe), indépendantes de l'existence du compte, répondent 400.
 * Le champ leurre `hp` rempli reçoit la même réponse générique sans rien faire.
 */
export const POST = publicRoute(async function POST(request: NextRequest) {
  const refused = checkJsonSameOrigin(request);
  if (refused) return refused;

  const body = await readJsonObject(request);
  if (!body) return badRequest();
  if (stringField(body, "hp").trim()) return jsonNoStore(GENERIC_EMAIL_SENT);

  const email = parseEmailInput(body.email);
  if (!email) return badRequest("Adresse e-mail invalide.", "EMAIL_INVALID");
  const name = stringField(body, "name").trim();
  if (name.length < 2 || name.length > L.name) return badRequest(`Indiquez votre prénom et nom (2 à ${L.name} caractères).`, "NAME_INVALID");
  const password = stringField(body, "password");
  const policy = checkPasswordPolicy(password, { email });
  if (policy) return badRequest(PASSWORD_POLICY_MESSAGES[policy], policy);

  // Quotas consommés après la validation de forme, avant le hachage coûteux ; clé = adresse saisie (hachée).
  const limited = await consumeDimensions([
    { key: `auth:signup-email:ip:${clientIp(request)}`, ...RATE_POLICIES.emailSignup.ip, sensitivity: "sensitive" },
    { key: `auth:signup-email:email:${emailKey(email)}`, ...RATE_POLICIES.emailSignup.email, sensitivity: "sensitive" },
  ]);
  if (!limited.allowed) return tooManyRequests(limited.retryAfterSec);

  try {
    // Toujours haché (même coût que l'adresse existe ou non) ; seul le haché est transmis à la tâche.
    const passwordHash = await hashPasswordAsync(password);
    scheduleEmailSignup({ email, name, passwordHash, requestOrigin: request.nextUrl.origin });
  } catch (error) {
    if (isAuthBusy(error)) return authBusy();
    logger.error("email signup failed", { route: "/api/auth/signup/email", error: error instanceof Error ? error.name : "unknown" });
    return jsonNoStore({ error: "Impossible de créer le compte. Réessayez." }, 500);
  }
  return jsonNoStore(GENERIC_EMAIL_SENT);
});

export const dynamic = "force-dynamic";
