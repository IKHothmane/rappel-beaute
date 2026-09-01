/** Réexporte le contexte analytics — Reports et Analytics partagent RBAC */
export {
  resolveAnalyticsContext,
  withScope,
  type AnalyticsContext,
} from "@/lib/analytics/context";

export { getAnalyticsScope, canReadAnalytics } from "@/lib/rbac";
