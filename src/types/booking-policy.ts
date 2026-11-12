export type DepositState =
  | "NOT_REQUIRED"
  | "AWAITING"
  | "PAID"
  | "FORFEITED"
  | "REFUNDED";

export type DepositDefaultMode = "NONE" | "FIXED" | "PERCENT";

export type DepositRetentionPolicy = "KEEP" | "REFUND";

export type BookingPolicySettings = {
  depositsEnabled: boolean;
  defaultMode: DepositDefaultMode;
  defaultFixedAmount: number | null;
  defaultPercent: number | null;
  confirmDeadlineHours: number;
  lateCancelHours: number;
  onCustomerLateCancel: DepositRetentionPolicy;
  onNoShow: DepositRetentionPolicy;
  onInstituteCancel: DepositRetentionPolicy;
  noShowWarnAt: number;
  noShowRequireDepositAt: number;
  noShowStrictAt: number;
};

export type UpdateBookingPolicyInput = Partial<BookingPolicySettings>;

export type NoShowRiskLevel = "NONE" | "WARN" | "REQUIRE_DEPOSIT" | "STRICT";

export type DepositRequirement = {
  amount: number;
  state: DepositState;
  dueAt: Date | null;
  forcedByNoShow: boolean;
};

