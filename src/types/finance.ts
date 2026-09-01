export type PaymentMethod = "CASH" | "CARD" | "TRANSFER" | "CHECK" | "ONLINE" | "GIFT_CARD";
export type PaymentKind = "PAYMENT" | "DEPOSIT" | "REFUND";
export type PaymentStatus = "PENDING" | "COMPLETED" | "REFUNDED" | "FAILED";

export type CashRegisterStatus = "OPEN" | "CLOSED";
export type CashTxnType =
  | "OPENING"
  | "SALE"
  | "REFUND_OUT"
  | "CASH_OUT"
  | "CASH_IN"
  | "CLOSING"
  | "EXPENSE";

export const PAYMENT_METHODS: PaymentMethod[] = [
  "CASH",
  "CARD",
  "TRANSFER",
  "CHECK",
  "ONLINE",
  "GIFT_CARD",
];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Espèces",
  CARD: "Carte",
  TRANSFER: "Virement",
  CHECK: "Chèque",
  ONLINE: "En ligne",
  GIFT_CARD: "Carte cadeau",
};

export const PAYMENT_KIND_LABEL: Record<PaymentKind, string> = {
  PAYMENT: "Paiement",
  DEPOSIT: "Acompte",
  REFUND: "Remboursement",
};

export const CASH_TXN_LABEL: Record<CashTxnType, string> = {
  OPENING: "Ouverture",
  SALE: "Encaissement",
  REFUND_OUT: "Remboursement",
  CASH_OUT: "Sortie",
  CASH_IN: "Entrée",
  CLOSING: "Fermeture",
  EXPENSE: "Dépense",
};

/** Seuil au-delà duquel CASHIER doit passer par OWNER/MANAGER */
export const REFUND_CASHIER_MAX = 200;

export type PaymentItem = {
  id: string;
  appointmentId: string | null;
  customerId: string | null;
  customerName: string | null;
  serviceName: string | null;
  amount: number;
  method: PaymentMethod;
  kind: PaymentKind;
  status: PaymentStatus;
  parentPaymentId: string | null;
  giftCardId: string | null;
  notes: string | null;
  userId: string | null;
  userName: string | null;
  paidAt: string;
  createdAt: string;
};

export type AppointmentPaymentSummary = {
  appointmentId: string;
  price: number;
  paid: number;
  refunded: number;
  netPaid: number;
  remaining: number;
  payments: PaymentItem[];
};

export type CreatePaymentLineInput = {
  amount: number;
  method: PaymentMethod;
  kind?: PaymentKind;
  giftCardId?: string;
  giftCardCode?: string;
};

export type CreatePaymentsInput = {
  appointmentId: string;
  items: CreatePaymentLineInput[];
  notes?: string;
  idempotencyKey?: string;
};

export type RefundPaymentInput = {
  amount: number;
  method: PaymentMethod;
  reason?: string;
  idempotencyKey?: string;
};

export type CashTxnItem = {
  id: string;
  sessionId: string;
  type: CashTxnType;
  amount: number;
  method: PaymentMethod | null;
  reason: string | null;
  paymentId: string | null;
  userId: string | null;
  userName: string | null;
  createdAt: string;
};

export type CashSessionSummary = {
  id: string;
  status: CashRegisterStatus;
  openingFloat: number;
  openedAt: string;
  openedById: string;
  openedByName: string | null;
  closedAt: string | null;
  closedById: string | null;
  closedByName: string | null;
  closingCounted: number | null;
  expectedBalance: number | null;
  difference: number | null;
  closeReason: string | null;
  notes: string | null;
  /** Somme des + SALE / CASH_IN (hors ouverture) */
  cashIn: number;
  /** Somme absolue des sorties */
  cashOut: number;
  /** Solde théorique espèces = ouverture + mouvements */
  theoreticalBalance: number;
  /** Totaux paiements du jour (toutes méthodes) hors caisse physique */
  paymentsToday: {
    cash: number;
    card: number;
    transfer: number;
    online: number;
    other: number;
    total: number;
  };
};

export type CashRegisterState = {
  session: CashSessionSummary | null;
  transactions: CashTxnItem[];
};

export type OpenCashInput = {
  openingFloat: number;
  notes?: string;
};

export type CloseCashInput = {
  countedAmount: number;
  reason: string;
};

export type ManualCashTxnInput = {
  type: "CASH_OUT" | "CASH_IN";
  amount: number;
  reason: string;
  idempotencyKey?: string;
};
