/** @deprecated Utiliser @/lib/rate-limit — shim de compatibilité */
export {
  checkRateLimit,
  resetRateLimitsForTests,
  publicRateLimitKey,
  bookingCompositeRateLimitKey,
  PUBLIC_RATE_LIMITS,
} from "@/lib/rate-limit";
