export type CustomerStatus = "ACTIVE" | "NEW" | "INACTIVE" | "AT_RISK" | "ARCHIVED";

export type CustomerSegment = "ALL" | "ACTIVE" | "VIP" | "NEW" | "INACTIVE" | "AT_RISK";

export type CustomerListItem = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  status: CustomerStatus;
  segment: CustomerSegment;
  visits: number;
  revenue: number;
  averageTicket: number;
  lastVisitAt: string | null;
  createdAt: string;
};

export type CustomerKpis = {
  total: number;
  newCount: number;
  vipCount: number;
  inactiveCount: number;
};

export type CustomerDetail = CustomerListItem & {
  birthDate: string | null;
  address: string | null;
  instagram: string | null;
  notes: string | null;
  marketingWhatsapp: boolean;
  marketingEmail: boolean;
  marketingSms: boolean;
  updatedAt: string;
};

export type CustomerAppointmentHistory = {
  id: string;
  startAt: string;
  serviceName: string;
  price: number;
  status: string;
};

export type CreateCustomerInput = {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  birthDate?: string;
  address?: string;
  instagram?: string;
  notes?: string;
  marketingWhatsapp?: boolean;
  marketingEmail?: boolean;
  marketingSms?: boolean;
};

export type UpdateCustomerInput = Partial<CreateCustomerInput> & {
  status?: CustomerStatus;
  archived?: boolean;
};

export type CustomerListResponse = {
  data: CustomerListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  kpis: CustomerKpis;
};

/** Seuils segmentation VIP (V1) */
export const VIP_MIN_REVENUE = 3000;
export const VIP_MIN_VISITS = 8;
export const AT_RISK_DAYS = 90;
export const NEW_CUSTOMER_DAYS = 30;
