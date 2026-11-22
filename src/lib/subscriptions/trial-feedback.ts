import { createHmac, timingSafeEqual } from "node:crypto";
import { getSessionSecret } from "@/lib/auth/env";
import { appEnvironment, publicAppOrigin, SITE } from "@/lib/site";

/**
 * Jeton du lien « Donner mon avis » de l'e-mail de fin d'essai : identifiant de l'abonnement et nom de l'institut,
 * signés. Le lien rattache l'avis au bon compte sans connexion, sans lecture de base côté page publique et sans
 * aucune information personnelle (ni e-mail, ni téléphone) dans l'adresse.
 */
const PURPOSE = "trial-feedback:v1:";
const ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;
const MAX_TOKEN_LENGTH = 400;

export type TrialFeedbackSubject = { subscriptionId: string; orgName: string };

function signature(payload: string): string {
  return createHmac("sha256", getSessionSecret()).update(PURPOSE).update(payload).digest("base64url");
}

export function signTrialFeedbackToken(subject: TrialFeedbackSubject): string {
  const payload = Buffer.from(
    JSON.stringify({ i: subject.subscriptionId, o: subject.orgName.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 80) }),
  ).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

/** Renvoie l'abonnement et l'institut si le jeton est authentique, sinon null. */
export function verifyTrialFeedbackToken(token: unknown): TrialFeedbackSubject | null {
  if (typeof token !== "string" || token.length > MAX_TOKEN_LENGTH) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(signature(payload));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { i?: unknown; o?: unknown };
    if (typeof data.i !== "string" || !ID_PATTERN.test(data.i) || typeof data.o !== "string") return null;
    return { subscriptionId: data.i, orgName: data.o.slice(0, 80) };
  } catch {
    return null;
  }
}

/** Page publique du formulaire d'avis (site vitrine ; l'origine de l'application en staging et en local). */
export function trialFeedbackUrl(subject: TrialFeedbackSubject): string {
  const origin =
    process.env.NODE_ENV === "production" && appEnvironment() !== "staging" ? SITE.url : publicAppOrigin() || SITE.url;
  return `${origin}/avis-essai/?t=${encodeURIComponent(signTrialFeedbackToken(subject))}`;
}
