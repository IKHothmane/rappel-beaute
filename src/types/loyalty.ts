export type LoyaltyLevel = "BRONZE" | "SILVER" | "GOLD" | "VIP";
export type LoyaltyTxnType = "EARN" | "REDEEM" | "ADJUSTMENT" | "EXPIRE";
export type LoyaltyRewardType = "DISCOUNT_FIXED" | "DISCOUNT_PERCENT" | "FREE_SERVICE";
export type PackageStatus = "ACTIVE" | "EXHAUSTED" | "VOID" | "EXPIRED";

export const LOYALTY_LEVEL_LABEL: Record<LoyaltyLevel, string> = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  VIP: "VIP",
};

export const LOYALTY_TXN_LABEL: Record<LoyaltyTxnType, string> = {
  EARN: "Gain",
  REDEEM: "Utilisation",
  ADJUSTMENT: "Ajustement",
  EXPIRE: "Expiration",
};

export type LoyaltyProgramConfig = {
  id: string;
  madPerPoint: number;
  bronzeMin: number;
  silverMin: number;
  goldMin: number;
  vipMin: number;
  active: boolean;
};

export type LoyaltyAccountSummary = {
  id: string;
  customerId: string;
  customerName: string;
  balance: number;
  lifetimePoints: number;
  level: LoyaltyLevel;
  updatedAt: string;
};

export type LoyaltyTxnItem = {
  id: string;
  type: LoyaltyTxnType;
  points: number;
  balanceAfter: number;
  reason: string | null;
  paymentId: string | null;
  createdAt: string;
};

export type LoyaltyRewardItem = {
  id: string;
  name: string;
  description: string | null;
  pointsCost: number;
  type: LoyaltyRewardType;
  value: number | null;
  serviceId: string | null;
  active: boolean;
  maxRedemptions: number | null;
  redemptionCount: number;
};

export type CustomerLoyaltyView = {
  account: LoyaltyAccountSummary | null;
  todayEarned: number;
  nextReward: LoyaltyRewardItem | null;
  pointsToNextReward: number | null;
  recentTxns: LoyaltyTxnItem[];
  program: LoyaltyProgramConfig;
  redeemableRewards?: LoyaltyRewardItem[];
};

export type LoyaltyKpis = {
  membersCount: number;
  pointsDistributed: number;
  pointsRedeemed: number;
  rewardsUsed: number;
};

export type PackageListItem = {
  id: string;
  customerId: string;
  customerName: string;
  name: string;
  serviceId: string | null;
  serviceName: string | null;
  sessionTotal: number;
  sessionUsed: number;
  sessionRemaining: number;
  pricePaid: number;
  status: PackageStatus;
  purchasedAt: string;
  expiresAt: string | null;
};

export type CreatePackageInput = {
  customerId: string;
  name: string;
  serviceId: string;
  sessionTotal: number;
  pricePaid: number;
  expiresAt?: string;
  notes?: string;
};

export type UpdateLoyaltyProgramInput = {
  madPerPoint?: number;
  bronzeMin?: number;
  silverMin?: number;
  goldMin?: number;
  vipMin?: number;
  active?: boolean;
};

export type CreateRewardInput = {
  name: string;
  description?: string;
  pointsCost: number;
  type: LoyaltyRewardType;
  value?: number;
  serviceId?: string;
  maxRedemptions?: number;
};

export type RedeemRewardInput = {
  customerId: string;
  rewardId: string;
  appointmentId?: string;
  idempotencyKey?: string;
};
