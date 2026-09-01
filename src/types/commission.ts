/** Commissions produits désactivées en V1 (éviter double logique stock/vente) */
export const PRODUCT_COMMISSIONS_ENABLED = false;

export type CommissionType = "PERCENTAGE" | "FIXED";
export type CommissionPeriodStatus = "OPEN" | "CLOSED";
export type CommissionPaidFilter = "all" | "paid" | "unpaid";
export type CommissionPeriodPreset =
  | "today"
  | "week"
  | "month"
  | "prev_month"
  | "custom";

export const COMMISSION_TYPE_LABEL: Record<CommissionType, string> = {
  PERCENTAGE: "%",
  FIXED: "Fixe",
};

export type CommissionListItem = {
  id: string;
  appointmentId: string;
  staffId: string;
  staffName: string;
  serviceId: string;
  serviceName: string;
  appointmentAt: string;
  baseAmount: number;
  type: CommissionType;
  percentageSnapshot: number | null;
  fixedSnapshot: number | null;
  commissionAmount: number;
  adjustmentsTotal: number;
  netAmount: number;
  paid: boolean;
  paidAt: string | null;
  periodClosed: boolean;
  createdAt: string;
};

export type CommissionAdjustmentItem = {
  id: string;
  amount: number;
  reason: string;
  paymentId: string | null;
  createdById: string | null;
  createdAt: string;
};

export type CommissionDetail = CommissionListItem & {
  adjustments: CommissionAdjustmentItem[];
};

export type CommissionStaffAgg = {
  staffId: string;
  staffName: string;
  commissionTotal: number;
  baseTotal: number;
  count: number;
};

export type CommissionKpis = {
  commissionTotal: number;
  baseTotal: number;
  count: number;
  avgRatePct: number | null;
  byStaff: CommissionStaffAgg[];
};

export type CommissionListResponse = {
  data: CommissionListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  kpis: CommissionKpis;
  period: {
    from: string;
    to: string;
    preset: CommissionPeriodPreset;
    year: number;
    month: number;
    status: CommissionPeriodStatus;
  };
};

export type CommissionPeriodInfo = {
  id: string | null;
  year: number;
  month: number;
  status: CommissionPeriodStatus;
  closedAt: string | null;
  closedById: string | null;
};

export type CreateCommissionAdjustmentInput = {
  amount: number;
  reason: string;
  paymentId?: string;
  idempotencyKey?: string;
};

export type StaffCommissionSummary = {
  staffId: string;
  staffName: string;
  periodLabel: string;
  baseTotal: number;
  count: number;
  commissionTotal: number;
  netTotal: number;
  items: CommissionListItem[];
};
