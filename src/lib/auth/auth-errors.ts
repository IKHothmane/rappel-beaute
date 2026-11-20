/**
 * Codes d'erreur d'authentification renvoyés dans `{ error, code }` et leur texte français par défaut.
 * L'interface affiche le texte de `error` ; ce catalogue sert de référence commune (codes stables).
 */
export const AUTH_ERROR_MESSAGES = {
  /** Lien d'une action faite sur un autre hôte que celui qui porte les cookies (voir auth-hosts.ts). */
  WRONG_HOST: "Cette action doit être faite depuis l'adresse officielle de l'application. Ouvrez-la puis réessayez.",
  PENDING_EXPIRED: "Votre inscription a expiré. Recommencez.",
  TOKEN_INVALID: "Ce lien n'est plus valable. Demandez-en un nouveau.",
  REAUTH_REQUIRED: "Pour votre sécurité, reconnectez-vous puis réessayez.",
  EMAIL_NOT_VERIFIED: "Vérifiez d'abord votre adresse e-mail.",
  INVALID_PASSWORD: "Mot de passe incorrect.",
  CURRENT_PASSWORD_REQUIRED: "Saisissez votre mot de passe actuel.",
  PASSWORD_MISMATCH: "Le mot de passe ne correspond pas à celui de votre inscription.",
  PASSWORD_ALREADY_SET: "Un mot de passe est déjà défini. Utilisez le changement de mot de passe.",
  PHONE_TAKEN: "Ce numéro de téléphone possède déjà un compte.",
  PHONE_SIGNUP_DISABLED: "Inscription par téléphone désactivée, utilisez e-mail ou Google",
  NOT_AVAILABLE: "Impossible de créer ce compte. Connectez-vous avec votre e-mail puis liez Google.",
  RATE_LIMITED: "Trop de demandes. Réessayez plus tard.",
} as const;

export type AuthErrorCode = keyof typeof AUTH_ERROR_MESSAGES;
