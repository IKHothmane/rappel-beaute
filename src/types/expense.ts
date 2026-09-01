import type { PaymentMethod } from "@/types/finance";

export type ExpenseCategory =
  | "RENT"
  | "ELECTRICITY"
  | "WATER"
  | "INTERNET"
  | "SALARY"
  | "MARKETING"
  | "MAINTENANCE"
  | "TRANSPORT"
  | "OFFICE"
  | "PRODUCT_PURCHASE"
  | "OTHER";

export type ExpenseStatus = "RECORDED" | "VOID";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "RENT",
  "ELECTRICITY",
  "WATER",
  "INTERNET",
  "SALARY",
  "MARKETING",
  "MAINTENANCE",
  "TRANSPORT",
  "OFFICE",
  "PRODUCT_PURCHASE",
  "OTHER",
];

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  RENT: "Loyer",
  ELECTRICITY: "Électricité",
  WATER: "Eau",
  INTERNET: "Internet",
  SALARY: "Salaires",
  MARKETING: "Marketing",
  MAINTENANCE: "Maintenance",
  TRANSPORT: "Transport",
  OFFICE: "Fournitures",
  PRODUCT_PURCHASE: "Achats produits (charge)",
  OTHER: "Autres",
};

export const EXPENSE_STATUS_LABEL: Record<ExpenseStatus, string> = {
  RECORDED: "Enregistrée",
  VOID: "Annulée",
};

export type ExpenseListItem = {
  id: string;
  category: ExpenseCategory;
  amount: number;
  paymentMethod: PaymentMethod;
  description: string | null;
  supplierId: string | null;
  supplierName: string | null;
  expenseDate: string;
  reference: string | null;
  status: ExpenseStatus;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
};

export type ExpenseDetail = ExpenseListItem & {
  updatedAt: string;
};

export type ExpenseKpis = {
  monthTotal: number;
  todayTotal: number;
  prevMonthTotal: number;
  evolutionPct: number | null;
};

export type ExpenseListResponse = {
  data: ExpenseListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  kpis: ExpenseKpis;
};

export type CreateExpenseInput = {
  category: ExpenseCategory;
  amount: number;
  paymentMethod: PaymentMethod;
  description?: string;
  supplierId?: string;
  expenseDate: string;
  reference?: string;
};

export type UpdateExpenseInput = {
  category?: ExpenseCategory;
  amount?: number;
  paymentMethod?: PaymentMethod;
  description?: string | null;
  supplierId?: string | null;
  expenseDate?: string;
  reference?: string | null;
};
