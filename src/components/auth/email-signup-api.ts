/** Appels JSON same-origin des parcours e-mail (inscription, vérification, renvoi). Aucun secret n'est journalisé. */
export type AuthApiResult = {
  ok: boolean;
  status: number;
  message?: string;
  error?: string;
  code?: string;
  host?: string;
  origin?: string;
  email?: string;
  name?: string;
  redirect?: string;
  verified?: boolean;
};

export async function postAuthJson(url: string, body: unknown): Promise<AuthApiResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Omit<AuthApiResult, "ok" | "status">;
    return { ...data, ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0, error: "Réseau indisponible. Réessayez." };
  }
}

/** Renvoi du lien d'inscription (réponse générique : ne révèle jamais si l'adresse existe). */
export const resendSignupEmail = (email: string) =>
  postAuthJson("/api/auth/signup/email/resend/", { email: email.trim(), hp: "" });

export const RESENT_MESSAGE = "Si cette adresse peut être utilisée, un nouvel e-mail vient d'être envoyé.";
