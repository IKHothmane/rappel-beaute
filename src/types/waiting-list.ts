export type WaitingListStatus =
  | "WAITING"
  | "NOTIFIED"
  | "BOOKED"
  | "EXPIRED"
  | "CANCELLED";

export type WaitingListEntry = {
  id: string;
  organizationId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  serviceName: string;
  staffId: string | null;
  staffName: string | null;
  preferredDate: string;
  preferredTimeFrom: string | null;
  preferredTimeTo: string | null;
  status: WaitingListStatus;
  notes: string | null;
  notifiedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export type CreateWaitingListInput = {
  customerId: string;
  serviceId: string;
  staffId?: string | null;
  preferredDate: string;
  preferredTimeFrom?: string | null;
  preferredTimeTo?: string | null;
  notes?: string | null;
  expiresAt?: string | null;
};

