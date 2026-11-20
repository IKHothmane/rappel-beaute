/** Fenêtres en ms. Chiffres de départ — à ajuster selon le trafic réel. */
const MIN = 60_000;
const MIN_10 = 10 * MIN;
const MIN_15 = 15 * MIN;
const HOUR = 60 * MIN;

export const RATE_POLICIES = {
  // Verrouillage ciblé. Les routes de connexion consomment d'abord IP et couple IP+compte (10 essais / 15 min par
  // couple) et REFUSENT sans toucher au compteur du compte quand l'un d'eux est épuisé : une seule IP ne peut donc
  // pas alimenter le compteur « compte seul » (40 / 15 min) et bloquer le propriétaire. Ce plafond n'est atteint que
  // par une attaque répartie sur au moins quatre IP, et dure alors 15 minutes au plus.
  login: {
    ip: { limit: 20, windowMs: MIN_15 },
    account: { limit: 40, windowMs: MIN_15 },
    pair: { limit: 10, windowMs: MIN_15 },
  },
  forgotPassword: {
    ip: { limit: 5, windowMs: HOUR },
    account: { limit: 3, windowMs: HOUR },
  },
  activate: {
    ip: { limit: 5, windowMs: MIN_15 },
    token: { limit: 5, windowMs: MIN_15 },
  },
  signup: {
    ip: { limit: 5, windowMs: HOUR },
    account: { limit: 3, windowMs: HOUR },
  },
  // Inscription par e-mail vérifié. Clé « e-mail » = HMAC de l'adresse saisie (jamais l'adresse), consommée que
  // le compte existe ou non : la limite ne trahit rien et protège la boîte d'un tiers contre l'envoi répété.
  emailSignup: {
    ip: { limit: 5, windowMs: HOUR },
    email: { limit: 3, windowMs: HOUR },
    resendIp: { limit: 5, windowMs: HOUR },
    resendEmail: { limit: 3, windowMs: HOUR },
    verifyIp: { limit: 20, windowMs: MIN_15 },
    verifyToken: { limit: 10, windowMs: MIN_15 },
    completeIp: { limit: 5, windowMs: HOUR },
    completeSubject: { limit: 5, windowMs: HOUR },
    pendingIp: { limit: 30, windowMs: MIN_15 },
  },
  // « Sécuriser mon compte » (utilisateur connecté) et lien de changement d'e-mail.
  accountSecurity: {
    emailUser: { limit: 5, windowMs: HOUR },
    emailIp: { limit: 20, windowMs: HOUR },
    emailTarget: { limit: 3, windowMs: HOUR },
    passwordUser: { limit: 10, windowMs: MIN_15 },
    passwordIp: { limit: 20, windowMs: MIN_15 },
    verifyIp: { limit: 20, windowMs: MIN_15 },
    verifyToken: { limit: 10, windowMs: MIN_15 },
  },
  googleAuth: {
    start: { ip: { limit: 20, windowMs: MIN_15 } },
    callback: {
      ip: { limit: 30, windowMs: MIN_15 },
      subject: { limit: 10, windowMs: MIN_15 },
    },
    pending: { ip: { limit: 30, windowMs: MIN_15 } },
    signup: {
      ip: { limit: 5, windowMs: HOUR },
      subject: { limit: 3, windowMs: HOUR },
    },
    link: {
      user: { limit: 5, windowMs: MIN_15 },
      ip: { limit: 20, windowMs: MIN_15 },
    },
    unlink: { user: { limit: 5, windowMs: MIN_15 } },
  },
  changePassword: {
    user: { limit: 10, windowMs: MIN_15 },
    ip: { limit: 20, windowMs: MIN_15 },
  },
  booking: {
    ip: { limit: 10, windowMs: MIN_10 },
    phone: { limit: 3, windowMs: HOUR },
    pair: { limit: 3, windowMs: HOUR },
  },
  assistantWidget: {
    ip: { limit: 30, windowMs: MIN_10 },
    widget: { limit: 60, windowMs: MIN_10 },
  },
  productOrder: {
    ip: { limit: 10, windowMs: MIN_10 },
    phone: { limit: 20, windowMs: HOUR },
  },
  publicRead: { limit: 120, windowMs: MIN },
  availability: { limit: 60, windowMs: MIN },
  ai: {
    user: { limit: 20, windowMs: MIN },
    ip: { limit: 40, windowMs: MIN },
  },
} as const;
