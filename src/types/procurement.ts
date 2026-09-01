export type PurchaseStatus =
  | "DRAFT"
  | "ORDERED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

export const PURCHASE_STATUSES: PurchaseStatus[] = [
  "DRAFT",
  "ORDERED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
];

export const PURCHASE_STATUS_LABEL: Record<PurchaseStatus, string> = {
  DRAFT: "Brouillon",
  ORDERED: "Commandée",
  PARTIALLY_RECEIVED: "Réception partielle",
  RECEIVED: "Reçue",
  CANCELLED: "Annulée",
};

export type SupplierListItem = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  contactName: string | null;
  active: boolean;
  productCount: number;
  purchaseCount: number;
  totalPurchased: number;
};

export type SupplierKpis = {
  supplierCount: number;
  activeCount: number;
  openOrdersCount: number;
  monthPurchasesTotal: number;
};

export type ProductSupplierLink = {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  unit: string;
  supplierId: string;
  supplierName: string;
  supplierSku: string | null;
  purchasePrice: number;
  minimumOrderQuantity: number | null;
  leadTimeDays: number | null;
  preferred: boolean;
};

export type SupplierDetail = SupplierListItem & {
  address: string | null;
  notes: string | null;
  lastPurchaseAt: string | null;
  products: ProductSupplierLink[];
  recentPurchases: PurchaseListItem[];
  createdAt: string;
  updatedAt: string;
};

export type CreateSupplierInput = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  contactName?: string;
  notes?: string;
  active?: boolean;
};

export type UpdateSupplierInput = Partial<CreateSupplierInput>;

export type LinkProductSupplierInput = {
  productId: string;
  supplierSku?: string;
  purchasePrice: number;
  minimumOrderQuantity?: number;
  leadTimeDays?: number;
  preferred?: boolean;
};

export type PurchaseItemInput = {
  productId: string;
  quantityOrdered: number;
  unitPrice: number;
};

export type PurchaseItemRow = {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantityOrdered: number;
  quantityReceived: number;
  quantityRemaining: number;
  unitPrice: number;
  unit: string;
  lineTotal: number;
};

export type PurchaseListItem = {
  id: string;
  number: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseStatus;
  itemCount: number;
  total: number;
  orderedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
};

export type PurchaseKpis = {
  draftCount: number;
  orderedCount: number;
  awaitingReceiptCount: number;
  monthTotal: number;
};

export type PurchaseReceiptLine = {
  id: string;
  purchaseItemId: string;
  productId: string;
  productName: string;
  quantity: number;
  lotNumber: string | null;
  expiresAt: string | null;
  inventoryMovementId: string | null;
};

export type PurchaseReceipt = {
  id: string;
  receivedAt: string;
  userId: string | null;
  userName: string | null;
  notes: string | null;
  idempotencyKey: string;
  lines: PurchaseReceiptLine[];
};

export type PurchaseDetail = PurchaseListItem & {
  notes: string | null;
  createdById: string | null;
  items: PurchaseItemRow[];
  receipts: PurchaseReceipt[];
  updatedAt: string;
};

export type CreatePurchaseInput = {
  supplierId: string;
  notes?: string;
  items: PurchaseItemInput[];
  /** Si true, passe directement en ORDERED */
  submit?: boolean;
};

export type UpdatePurchaseInput = {
  notes?: string;
  items?: PurchaseItemInput[];
  status?: Extract<PurchaseStatus, "DRAFT" | "ORDERED" | "CANCELLED">;
};

export type ReceivePurchaseItemInput = {
  purchaseItemId: string;
  quantity: number;
  lotNumber?: string;
  expiresAt?: string;
};

export type ReceivePurchaseInput = {
  idempotencyKey: string;
  notes?: string;
  items: ReceivePurchaseItemInput[];
};

export type SupplierListResponse = {
  data: SupplierListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  kpis: SupplierKpis;
};

export type PurchaseListResponse = {
  data: PurchaseListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  kpis: PurchaseKpis;
};
