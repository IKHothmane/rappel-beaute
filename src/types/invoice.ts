export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "VOID";

export const INVOICE_STATUSES: InvoiceStatus[] = [
  "DRAFT",
  "ISSUED",
  "PARTIALLY_PAID",
  "PAID",
  "VOID",
];

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  DRAFT: "Brouillon",
  ISSUED: "Émise",
  PARTIALLY_PAID: "Partiellement payée",
  PAID: "Payée",
  VOID: "Annulée",
};

export type InvoiceItemRow = {
  id: string;
  serviceId: string | null;
  nameSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  discount: number;
  total: number;
  sortOrder: number;
};

export type InvoiceListItem = {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  appointmentId: string | null;
  status: InvoiceStatus;
  subtotal: number;
  discountTotal: number;
  total: number;
  paidAmount: number;
  remaining: number;
  issuedAt: string | null;
  createdAt: string;
  paymentMethods: string[];
};

export type InvoiceDetail = InvoiceListItem & {
  orgNameSnapshot: string;
  orgAddressSnapshot: string | null;
  orgPhoneSnapshot: string | null;
  orgIceSnapshot: string | null;
  customerNameSnapshot: string;
  customerPhoneSnapshot: string | null;
  promotionId: string | null;
  promotionNameSnapshot: string | null;
  promotionCodeSnapshot: string | null;
  promotionTypeSnapshot: string | null;
  notes: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  items: InvoiceItemRow[];
  updatedAt: string;
};

export type InvoiceKpis = {
  billedTotal: number;
  paidTotal: number;
  unpaidTotal: number;
  monthCount: number;
};

export type InvoiceListResponse = {
  data: InvoiceListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  kpis: InvoiceKpis;
};

export type CreateInvoiceFromAppointmentInput = {
  appointmentId: string;
  /** Ignoré si promotionId/code fourni — le backend recalcule */
  discountTotal?: number;
  promotionId?: string;
  promotionCode?: string;
  notes?: string;
  /** Force issue even if already exists (ignored if idempotent) */
  issue?: boolean;
};

export type VoidInvoiceInput = {
  reason: string;
};
