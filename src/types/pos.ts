import type { PaymentMethod } from "@/types/finance";
import type { ProductCategory } from "@/types/inventory";

export type PosSaleStatus = "COMPLETED" | "REFUNDED" | "CANCELLED";

export type PosCartLineInput = {
  productId: string;
  quantity: number;
};

export type CreatePosSaleInput = {
  lines: PosCartLineInput[];
  paymentMethod: PaymentMethod;
  customerId?: string | null;
  discountTotal?: number;
  notes?: string | null;
  idempotencyKey: string;
};

export type PosSaleLine = {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  category: ProductCategory | null;
};

export type PosSaleDetail = {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  paymentId: string | null;
  customerId: string | null;
  customerName: string | null;
  status: PosSaleStatus;
  subtotal: number;
  discountTotal: number;
  total: number;
  paymentMethod: PaymentMethod;
  lines: PosSaleLine[];
  soldById: string | null;
  notes: string | null;
  createdAt: string;
};

export type PosProductItem = {
  id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  salePrice: number;
  stock: number;
  unit: string;
  brand: string | null;
};

export const POS_SALE_STATUS_LABEL: Record<PosSaleStatus, string> = {
  COMPLETED: "Encaissée",
  REFUNDED: "Remboursée",
  CANCELLED: "Annulée",
};
