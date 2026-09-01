export type ProductCategory =
  | "PROFESSIONNEL"
  | "VENTE"
  | "CONSOMMABLE"
  | "MATERIEL"
  | "ACCESSOIRE"
  | "JETABLE";

export type ProductUnit = "UNIT" | "ML" | "L" | "G" | "KG" | "BOX" | "PACK" | "PIECE";

export type MovementType =
  | "PURCHASE"
  | "SERVICE_CONSUMPTION"
  | "SALE"
  | "RETURN"
  | "LOSS"
  | "DAMAGE"
  | "EXPIRATION"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT";

export type InventoryReferenceType =
  | "APPOINTMENT"
  | "PURCHASE"
  | "INVENTORY"
  | "SALE"
  | "MANUAL";

export type StockAlertLevel = "OK" | "LOW" | "OUT" | "EXPIRING" | "EXPIRED";

export const PRODUCT_CATEGORY_LABEL: Record<ProductCategory, string> = {
  PROFESSIONNEL: "Professionnel",
  VENTE: "Vente",
  CONSOMMABLE: "Consommable",
  MATERIEL: "Matériel",
  ACCESSOIRE: "Accessoire",
  JETABLE: "Jetable",
};

export const PRODUCT_UNIT_LABEL: Record<ProductUnit, string> = {
  UNIT: "Unité",
  ML: "ml",
  L: "L",
  G: "g",
  KG: "kg",
  BOX: "Boîte",
  PACK: "Pack",
  PIECE: "Pièce",
};

export const MOVEMENT_TYPE_LABEL: Record<MovementType, string> = {
  PURCHASE: "Achat",
  SERVICE_CONSUMPTION: "Consommation service",
  SALE: "Vente",
  RETURN: "Retour",
  LOSS: "Perte",
  DAMAGE: "Casse",
  EXPIRATION: "Expiration",
  ADJUSTMENT_IN: "Ajustement +",
  ADJUSTMENT_OUT: "Ajustement −",
  TRANSFER_IN: "Transfert entrant",
  TRANSFER_OUT: "Transfert sortant",
};

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "PROFESSIONNEL",
  "VENTE",
  "CONSOMMABLE",
  "MATERIEL",
  "ACCESSOIRE",
  "JETABLE",
];

export const PRODUCT_UNITS: ProductUnit[] = [
  "UNIT",
  "ML",
  "L",
  "G",
  "KG",
  "BOX",
  "PACK",
  "PIECE",
];

export type ProductListItem = {
  id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  brand: string | null;
  unit: ProductUnit;
  purchasePrice: number;
  salePrice: number | null;
  stock: number;
  minStock: number;
  maxStock: number | null;
  supplierName: string | null;
  consumable: boolean;
  sellable: boolean;
  active: boolean;
  stockValue: number;
  alert: StockAlertLevel;
  nearestExpiry: string | null;
  serviceCount: number;
};

export type ProductLotItem = {
  id: string;
  lotNumber: string;
  quantity: number;
  expiresAt: string | null;
  receivedAt: string;
  notes: string | null;
};

export type ProductServiceLink = {
  serviceId: string;
  serviceName: string;
  quantity: number;
  unit: string;
};

export type InventoryMovementItem = {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  type: MovementType;
  quantity: number;
  unit: ProductUnit;
  reason: string | null;
  referenceType: InventoryReferenceType | null;
  referenceId: string | null;
  userId: string | null;
  userName: string | null;
  createdAt: string;
};

export type ProductDetail = ProductListItem & {
  notes: string | null;
  lots: ProductLotItem[];
  services: ProductServiceLink[];
  recentMovements: InventoryMovementItem[];
  suppliers: {
    supplierId: string;
    supplierName: string;
    purchasePrice: number;
    preferred: boolean;
  }[];
  createdAt: string;
  updatedAt: string;
};

export type StockKpis = {
  productCount: number;
  activeCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  totalStockValue: number;
};

export type CreateProductInput = {
  name: string;
  sku: string;
  category?: ProductCategory;
  brand?: string;
  unit?: ProductUnit;
  purchasePrice?: number;
  salePrice?: number;
  minStock?: number;
  maxStock?: number;
  supplierName?: string;
  consumable?: boolean;
  sellable?: boolean;
  active?: boolean;
  notes?: string;
  /** Stock initial via mouvement PURCHASE */
  initialStock?: number;
};

export type UpdateProductInput = Partial<Omit<CreateProductInput, "initialStock" | "sku">> & {
  sku?: string;
};

export type CreateMovementInput = {
  productId: string;
  type: MovementType;
  quantity: number;
  reason?: string;
  referenceType?: InventoryReferenceType;
  referenceId?: string;
  idempotencyKey?: string;
};

export type InventoryCountItem = {
  productId: string;
  countedQuantity: number;
};

export type ProductListResponse = {
  data: ProductListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  kpis: StockKpis;
};

export type MovementListResponse = {
  data: InventoryMovementItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export function computeStockAlert(
  stock: number,
  minStock: number,
  nearestExpiry: Date | null,
  now = new Date(),
): StockAlertLevel {
  if (stock <= 0) return "OUT";
  if (nearestExpiry) {
    const days =
      (nearestExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (days < 0) return "EXPIRED";
    if (days <= 30) return "EXPIRING";
  }
  if (stock < minStock) return "LOW";
  return "OK";
}

export function movementSign(type: MovementType, absoluteQty: number): number {
  const abs = Math.abs(absoluteQty);
  switch (type) {
    case "PURCHASE":
    case "RETURN":
    case "ADJUSTMENT_IN":
    case "TRANSFER_IN":
      return abs;
    case "SERVICE_CONSUMPTION":
    case "SALE":
    case "LOSS":
    case "DAMAGE":
    case "EXPIRATION":
    case "ADJUSTMENT_OUT":
    case "TRANSFER_OUT":
      return -abs;
  }
}
