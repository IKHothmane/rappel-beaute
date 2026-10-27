/** Limites de longueur — inscription /professionnel/ (stockage + e-mails). */

export const PROFESSIONAL_SIGNUP_LIMITS = {
  name: 80,
  institut: 80,
  email: 120,
  website: 200,
  address: 200,
  message: 500,
  city: 80,
} as const;

export type ProfessionalSignupLimits = typeof PROFESSIONAL_SIGNUP_LIMITS;
