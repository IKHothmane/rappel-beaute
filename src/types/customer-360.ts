export type Customer360Stats = {
  lifetimeNetRevenue: number;
  visits: number;
  appointments: number;
  averageTicket: number;
  lastVisitAt: string | null;
  nextVisitAt: string | null;
  noShowCount: number;
  cancellationCount: number;
  loyaltyPoints: number;
  activePackages: number;
  giftCardsActive: number;
  openInvoices: number;
};

export type CustomerTimelineKind =
  | "APPOINTMENT"
  | "PAYMENT"
  | "INVOICE"
  | "LOYALTY"
  | "WHATSAPP"
  | "REVIEW"
  | "PROMOTION"
  | "PACKAGE"
  | "NOTE"
  | "GIFT_CARD";

export type CustomerTimelineEvent = {
  id: string;
  kind: CustomerTimelineKind;
  at: string;
  title: string;
  subtitle: string | null;
  amount: number | null;
  meta: Record<string, string | number | boolean | null>;
};

export type CustomerNoteItem = {
  id: string;
  customerId: string;
  content: string;
  authorId: string | null;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCustomerNoteInput = {
  content: string;
};

export type UpdateCustomerNoteInput = {
  content: string;
};
