/**
 * Définitions officielles des KPI Analytics V1.
 * Source de vérité partagée avec /dashboard, /analytics et /reports (étape 36).
 */
import { AT_RISK_DAYS, VIP_MIN_REVENUE, VIP_MIN_VISITS } from "@/types/customer";

export const ANALYTICS_TIMEZONE = "Africa/Casablanca";

export const KPI_DEFINITIONS = {
  /** Somme des paiements COMPLETED (kind=PAYMENT) sur paidAt dans la période */
  CA_BRUT: "SUM(Payment.amount) WHERE kind=PAYMENT AND status=COMPLETED",
  /** Paiements − remboursements (kind=REFUND soustraits) sur paidAt */
  CA_NET: "SUM(PAYMENT) − SUM(REFUND) WHERE status=COMPLETED",
  /** CA net / nombre de tickets (RDV distincts avec au moins un paiement net > 0) */
  PANIER_MOYEN: "CA_NET / COUNT(DISTINCT appointmentId avec paiement net > 0)",
  /** Dépenses actives (deletedAt IS NULL) sur expenseDate */
  DEPENSES: "SUM(Expense.amount) WHERE deletedAt IS NULL",
  /** CA net − dépenses période (marge opérationnelle simplifiée V1) */
  MARGE: "CA_NET − DEPENSES",
  /** RDV dont startAt tombe dans la période (tous statuts sauf filtres explicites) */
  RDV_TOTAL: "COUNT(Appointment) par startAt",
  /** NO_SHOW / (COMPLETED + NO_SHOW) pour RDV dont startAt est passé dans la période */
  NO_SHOW_RATE:
    "COUNT(NO_SHOW) / COUNT(status IN (COMPLETED, NO_SHOW)) WHERE startAt <= NOW()",
  /** Minutes réservées (CONFIRMED, ARRIVED, IN_PROGRESS, COMPLETED) / minutes planifiées StaffSchedule */
  OCCUPATION: "durée RDV actifs / durée horaires planifiés (congés exclus V1 partiel)",
  /** Cliente avec ≥1 RDV COMPLETED dans les 90 derniers jours */
  CLIENTE_ACTIVE: `Dernière visite COMPLETED ≤ ${AT_RISK_DAYS} jours`,
  /** Aucune visite COMPLETED depuis ${AT_RISK_DAYS} jours */
  CLIENTE_INACTIVE: `Dernière visite COMPLETED > ${AT_RISK_DAYS} jours ou jamais`,
  /** CA lifetime ≥ ${VIP_MIN_REVENUE} MAD OU visites COMPLETED ≥ ${VIP_MIN_VISITS} */
  VIP: `revenue ≥ ${VIP_MIN_REVENUE} MAD OR visits ≥ ${VIP_MIN_VISITS}`,
  /** Première visite COMPLETED dans la période */
  NOUVELLE_CLIENTE: "MIN(completedAt) dans période",
  /** Visite COMPLETED dans période après ≥90j sans visite */
  REACTIVEE: "Visite COMPLETED après gap ≥ 90j",
  /** Visite COMPLETED dans période avec visite antérieure avant début période */
  RETOUR: "Cliente avec historique avant from",
  /** Taux rétention période = retour / (retour + nouvelles) */
  RETENTION_RATE: "RETOUR / (RETOUR + NOUVELLE_CLIENTE)",
  /** Coût consommables = SUM(qty × purchasePrice) mouvements SERVICE_CONSUMPTION liés au service */
  COUT_CONSOMMABLES: "InventoryMovement SERVICE_CONSUMPTION × Product.purchasePrice",
  /** Marge service = CA service − coût consommables */
  MARGE_SERVICE: "CA service − coût consommables",
  /** LTV = CA net lifetime cliente (pas de projection) */
  LTV: "SUM paiements nets lifetime par cliente",
} as const;

export type KpiDefinitionKey = keyof typeof KPI_DEFINITIONS;
