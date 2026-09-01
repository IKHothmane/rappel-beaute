export type PromotionType =
  | "PERCENTAGE"
  | "FIXED_AMOUNT"
  | "FREE_SERVICE"
  | "PACKAGE"
  | "HAPPY_HOUR";

export type PromotionStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "EXPIRED";

export const PROMOTION_TYPES: PromotionType[] = [
  "PERCENTAGE",
  "FIXED_AMOUNT",
  "FREE_SERVICE",
  "PACKAGE",
  "HAPPY_HOUR",
];

export const PROMOTION_TYPE_LABEL: Record<PromotionType, string> = {
  PERCENTAGE: "Pourcentage",
  FIXED_AMOUNT: "Montant fixe",
  FREE_SERVICE: "Soin offert",
  PACKAGE: "Forfait",
  HAPPY_HOUR: "Happy Hour",
};

export const PROMOTION_STATUS_LABEL: Record<PromotionStatus, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  EXPIRED: "Expirée",
};

export type PromotionListItem = {
  id: string;
  name: string;
  code: string | null;
  type: PromotionType;
  status: PromotionStatus;
  value: number | null;
  serviceId: string | null;
  category: string | null;
  minAmount: number | null;
  maxUses: number | null;
  usageCount: number;
  startsAt: string | null;
  endsAt: string | null;
  timeStart: string | null;
  timeEnd: string | null;
  weekdays: string | null;
  description: string | null;
};

export type PromotionKpis = {
  activeCount: number;
  usedThisMonth: number;
  discountTotalMonth: number;
  estimatedRevenueMonth: number;
};

export type CreatePromotionInput = {
  name: string;
  code?: string;
  type: PromotionType;
  status?: PromotionStatus;
  value?: number;
  serviceId?: string;
  category?: string;
  customerId?: string;
  minAmount?: number;
  maxUses?: number;
  maxUsesPerCustomer?: number;
  startsAt?: string;
  endsAt?: string;
  timeStart?: string;
  timeEnd?: string;
  weekdays?: string;
  description?: string;
};

export type ComputedPromotionDiscount = {
  promotionId: string;
  name: string;
  code: string | null;
  type: PromotionType;
  discountAmount: number;
};

export type GiftCardStatus = "ACTIVE" | "USED" | "EXPIRED" | "CANCELLED";
export type GiftCardTxnType = "ISSUED" | "REDEEMED" | "ADJUSTMENT" | "REFUND";

export const GIFT_CARD_STATUS_LABEL: Record<GiftCardStatus, string> = {
  ACTIVE: "Active",
  USED: "Épuisée",
  EXPIRED: "Expirée",
  CANCELLED: "Annulée",
};

export type GiftCardListItem = {
  id: string;
  code: string;
  initialValue: number;
  balance: number;
  status: GiftCardStatus;
  buyerName: string | null;
  beneficiaryName: string | null;
  buyerCustomerId: string | null;
  beneficiaryCustomerId: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export type GiftCardKpis = {
  soldCount: number;
  soldValue: number;
  redeemedValue: number;
  remainingBalance: number;
};

export type CreateGiftCardInput = {
  amount: number;
  buyerCustomerId?: string;
  beneficiaryCustomerId?: string;
  expiresAt?: string;
  notes?: string;
};

export type GiftCardTxnItem = {
  id: string;
  type: GiftCardTxnType;
  amount: number;
  balanceAfter: number;
  reason: string | null;
  paymentId: string | null;
  createdAt: string;
};
