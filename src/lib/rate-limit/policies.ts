/** Fenêtres en ms. Chiffres de départ — à ajuster selon le trafic réel. */
const MIN = 60_000;
const MIN_10 = 10 * MIN;
const MIN_15 = 15 * MIN;
const HOUR = 60 * MIN;

export type LimitWindow = { limit: number; windowMs: number };

export const RATE_POLICIES = {
  login: {
    ip: { limit: 10, windowMs: MIN_15 },
    account: { limit: 10, windowMs: MIN_15 },
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
