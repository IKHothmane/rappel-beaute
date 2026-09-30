import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { issuePasswordResetToken } from "@/lib/db/activation";
import { sendTransactionalEmail } from "@/lib/email/send";
import { getClientIp } from "@/lib/http/client-ip";
import { logger } from "@/lib/logger";
import { consumeDimensions, emailKey, RATE_POLICIES } from "@/lib/rate-limit";
import { SITE } from "@/lib/site";

const GENERIC = {
  message: "Si ce compte existe, un lien de réinitialisation a été envoyé.",
};

function appBase(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "").replace(
    /\/$/,
    "",
  );
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") return SITE.appUrl;
  return "http://localhost:3000";
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  let email = "";
  try {
    const body = (await request.json()) as { email?: string };
    email = body.email?.trim().toLowerCase() ?? "";
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  }

  const account = emailKey(email);
  const rl = await consumeDimensions([
    { key: `auth:forgot:ip:${ip}`, ...RATE_POLICIES.forgotPassword.ip, sensitivity: "sensitive" },
    {
      key: `auth:forgot:account:${account}`,
      ...RATE_POLICIES.forgotPassword.account,
      sensitivity: "sensitive",
    },
  ]);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de demandes. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 3600) } },
    );
  }

  try {
    const token = await issuePasswordResetToken(email);
    if (token) {
      const link = `${appBase()}/activate/?token=${token}`;
      await sendTransactionalEmail({
        to: email,
        subject: `Réinitialisation du mot de passe — ${SITE.name}`,
        text: `Bonjour,\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n${link}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.\n`,
        html: `<p>Pour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure)&nbsp;:</p><p><a href="${link}">Réinitialiser mon mot de passe</a></p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>`,
      });
    }
  } catch (error) {
    logger.error("forgot-password send failed", {
      route: "/api/auth/forgot-password",
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  return NextResponse.json(GENERIC);
}
