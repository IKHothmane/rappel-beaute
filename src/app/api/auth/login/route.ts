import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateUser } from "@/lib/db/users";
import { authenticatePlatformUser } from "@/lib/db/platform-users";
import { writeAuditLog } from "@/lib/db/audit";
import { writePlatformAuditLog } from "@/lib/db/platform-audit";
import { createSessionCookie } from "@/lib/auth/session";
import {
  isAppSession,
  isPlatformSession,
  PLATFORM_SESSION_MAX_AGE_SEC,
  SESSION_MAX_AGE_SEC,
} from "@/lib/auth/types";
import { stripOrganizationId } from "@/lib/auth/api-guard";
import { clientIp } from "@/lib/http/client-ip";
import { logger } from "@/lib/logger";
import { consumeDimensions, emailKey, RATE_POLICIES } from "@/lib/rate-limit";
import { COOKIE_HOST } from "@/lib/domain";
import { looksLikeEmail, normalizeLoginIdentifier } from "@/lib/auth/login-identifier";
import { phoneLoginEnabled } from "@/lib/auth/env";
import { burnPasswordCheck } from "@/lib/auth/crypto";
import { getEmailSetupRequired } from "@/lib/db/account-security";
import { publicRoute } from "@/lib/http/route-scope";
import { checkAuthPostOrigin } from "@/lib/http/json-same-origin";

async function readLoginBody(request: NextRequest): Promise<{
  identifier?: string;
  email?: string;
  password?: string;
  organizationId?: string;
  remember?: boolean;
} | null> {
  const raw = await request.text();
  if (!raw.trim()) return null;
  try {
    return stripOrganizationId(JSON.parse(raw) as Record<string, unknown>) as {
      identifier?: string;
      email?: string;
      password?: string;
      organizationId?: string;
      remember?: boolean;
    };
  } catch {
    // JSON uniquement (le repli application/x-www-form-urlencoded est retiré : aucun formulaire ne l'utilise).
    return null;
  }
}

/** Seules les pannes de connexion à la base donnent un 503 ; le message reste générique. */
function isDatabaseUnavailable(error: unknown): boolean {
  const code = typeof error === "object" && error !== null ? (error as { code?: unknown }).code : undefined;
  if (typeof code === "string" && ["ECONNREFUSED", "ETIMEDOUT", "ECONNRESET", "57P01", "57P03", "08001", "08006"].includes(code)) {
    return true;
  }
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : "";
  return name === "AggregateError" || /(ECONNREFUSED|P1001)/.test(message);
}

export const POST = publicRoute(async function POST(request: NextRequest) {
  const ip = clientIp(request);

  const csrf = checkAuthPostOrigin(request);
  if (csrf) return csrf;

  try {
    const body = await readLoginBody(request);
    if (!body) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }
    const rawIdentifier = body.identifier ?? body.email;
    const email = typeof rawIdentifier === "string" ? normalizeLoginIdentifier(rawIdentifier) : "";
    const password = body.password;
    const remember = body.remember !== false;
    const sessionMaxAge = remember ? SESSION_MAX_AGE_SEC : null;

    if (!email || !password) {
      return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
    }

    const account = emailKey(email);
    // 1) IP et couple IP+compte. Refus : on s'arrête ici, le compteur du compte n'est PAS alimenté (sinon une seule
    //    IP pourrait épuiser le plafond du compte et bloquer son propriétaire).
    // 2) Plafond du compte seul, contre une attaque répartie sur plusieurs IP.
    let rl = await consumeDimensions([
      { key: `auth:login:ip:${ip}`, ...RATE_POLICIES.login.ip, sensitivity: "sensitive" },
      { key: `auth:login:ip-account:${ip}:${account}`, ...RATE_POLICIES.login.pair, sensitivity: "sensitive" },
    ]);
    if (rl.allowed) {
      rl = await consumeDimensions([
        { key: `auth:login:account:${account}`, ...RATE_POLICIES.login.account, sensitivity: "sensitive" },
      ]);
    }
    if (!rl.allowed) {
      logger.warn("login rate limited", { route: "/api/auth/login", method: "POST" });
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez plus tard." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 900) } },
      );
    }

    // Téléphone désactivé : un identifiant qui n'est pas une adresse e-mail est refusé après les limites de débit,
    // avec le même message et le même coût (une vérification factice) qu'un refus ordinaire.
    if (!phoneLoginEnabled() && !looksLikeEmail(email)) {
      await burnPasswordCheck(String(password));
      return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
    }

    const session =
      (await authenticateUser(email, password)) ?? (await authenticatePlatformUser(email, password));
    if (!session) {
      return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
    }

    if (isPlatformSession(session)) {
      await writePlatformAuditLog({
        platformUserId: session.id,
        platformUserName: `${session.firstName} ${session.lastName}`.trim(),
        entityType: "PlatformUser",
        entityId: session.id,
        action: "LOGIN",
      }).catch((err) => logger.warn("platform LOGIN audit failed", { error: String(err) }));

      // Le jeton porte la sessionVersion lue en base : un changement de mot de passe ou une
      // désactivation ultérieurs le révoquent. Durée plateforme plus courte que celle d'un institut.
      const platformMaxAge = remember ? PLATFORM_SESSION_MAX_AGE_SEC : null;
      const res = NextResponse.json({
        user: {
          id: session.id,
          email: session.email,
          firstName: session.firstName,
          lastName: session.lastName,
          role: session.role,
          accountType: session.accountType,
          scope: session.scope,
        },
      });
      res.headers.set("Clear-Site-Data", '"cache"');
      res.cookies.set(createSessionCookie(session, platformMaxAge));
      res.cookies.set(COOKIE_HOST, "admin", {
        path: "/",
        sameSite: "lax",
        ...(platformMaxAge == null ? {} : { maxAge: platformMaxAge }),
      });
      return res;
    }

    if (!isAppSession(session)) {
      return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
    }

    await writeAuditLog({
      organizationId: session.organizationId,
      actorId: session.id,
      actorName: `${session.firstName} ${session.lastName}`.trim(),
      entityType: "User",
      entityId: session.id,
      action: "LOGIN",
    }).catch((err) => {
      logger.warn("audit LOGIN failed", { userId: session.id, error: String(err) });
    });

    // Champ additif : l'interface propose « Sécuriser mon compte » tant que l'e-mail est absent ou non vérifié.
    const emailSetupRequired = await getEmailSetupRequired(session.id);
    const res = NextResponse.json({
      user: {
        id: session.id,
        email: session.email,
        firstName: session.firstName,
        lastName: session.lastName,
        role: session.role,
        orgName: session.orgName,
        orgSlug: session.orgSlug,
        accountType: session.accountType,
        scope: session.scope,
        mustChangePassword: session.mustChangePassword,
        ...(emailSetupRequired === undefined ? {} : { emailSetupRequired }),
      },
      mustChangePassword: session.mustChangePassword,
    });

    res.headers.set("Clear-Site-Data", '"cache"');
    res.cookies.set(createSessionCookie(session, sessionMaxAge));
    res.cookies.set(COOKIE_HOST, "app", {
      path: "/",
      sameSite: "lax",
      ...(sessionMaxAge == null ? {} : { maxAge: sessionMaxAge }),
    });
    return res;
  } catch (error) {
    logger.error("login error", { route: "/api/auth/login", error: String(error) });
    if ((error as { code?: unknown } | null)?.code === "AUTH_BUSY") {
      // File de vérification des mots de passe pleine : surcharge, indépendante du compte visé.
      return NextResponse.json(
        { error: "Service momentanément indisponible. Réessayez." },
        { status: 503, headers: { "Retry-After": "5" } },
      );
    }
    if (isDatabaseUnavailable(error)) {
      return NextResponse.json({ error: "Service momentanément indisponible. Réessayez." }, { status: 503 });
    }
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
  }
});
