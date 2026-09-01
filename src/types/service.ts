export type CommissionType = "PERCENTAGE" | "FIXED";

export type ServiceListItem = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  price: number;
  durationMin: number;
  prepTimeMin: number;
  cleanupTimeMin: number;
  deposit: number | null;
  active: boolean;
  staffCount: number;
  staffNames: string[];
  resourceCount: number;
  productCount: number;
};

export type ServiceStaffLink = { staffId: string; staffName: string };

export type ServiceResourceLink = {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  quantity: number;
};

export type ServiceProductLink = {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unit: string;
};

export type ServiceCommissionLink = {
  id: string;
  staffId: string;
  staffName: string;
  type: CommissionType;
  percentage: number | null;
  fixedAmount: number | null;
};

export type ServiceDetail = ServiceListItem & {
  staff: ServiceStaffLink[];
  resources: ServiceResourceLink[];
  products: ServiceProductLink[];
  commissions: ServiceCommissionLink[];
  totalBlockMin: number;
  createdAt: string;
  updatedAt: string;
};

export type ServiceAgendaOption = {
  id: string;
  name: string;
  price: number;
  durationMin: number;
  prepTimeMin: number;
  cleanupTimeMin: number;
  totalBlockMin: number;
  deposit: number | null;
  active: boolean;
  staffIds: string[];
  resourceIds: string[];
};

export type CreateServiceInput = {
  name: string;
  description?: string;
  category?: string;
  price: number;
  durationMin: number;
  prepTimeMin?: number;
  cleanupTimeMin?: number;
  deposit?: number;
  active?: boolean;
  staffIds?: string[];
  resources?: { resourceId: string; quantity?: number }[];
  products?: { productId: string; quantity: number; unit: string }[];
  commissions?: {
    staffId: string;
    type: CommissionType;
    percentage?: number;
    fixedAmount?: number;
  }[];
};

export type UpdateServiceInput = Partial<CreateServiceInput>;

export type ServiceListResponse = {
  data: ServiceListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  categories: string[];
};

export const SERVICE_CATEGORIES = [
  "Soins visage",
  "Corps & massage",
  "Mains & pieds",
  "Épilation",
  "Maquillage",
  "Autre",
] as const;

export type ServiceFormOptions = {
  staff: { id: string; name: string; role: string | null }[];
  resources: { id: string; name: string; type: string }[];
  products: { id: string; name: string; sku: string; unit: string }[];
};
