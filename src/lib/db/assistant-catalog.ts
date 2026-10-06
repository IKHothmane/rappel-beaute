import { Pool } from "pg";
import { getPublicProducts } from "@/lib/db/public-shop";
import { getPublicServices } from "@/lib/db/public-booking";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export type PublicCatalogService = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  durationMin: number;
};

export type PublicCatalogProduct = {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  salePrice: number;
  inStock: boolean;
};

export type PublicCatalogPromotion = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  value: number | null;
};

export async function listCatalogServices(organizationId: string): Promise<PublicCatalogService[]> {
  const services = await getPublicServices(organizationId);
  return services.map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description,
    category: service.category,
    price: service.price,
    durationMin: service.durationMin,
  }));
}

export async function listCatalogProducts(organizationId: string): Promise<PublicCatalogProduct[]> {
  const products = await getPublicProducts(organizationId);
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    salePrice: product.salePrice,
    inStock: product.inStock,
  }));
}

export async function listCatalogPromotions(
  organizationId: string,
): Promise<PublicCatalogPromotion[]> {
  const { rows } = await pool.query<{
    id: string;
    name: string;
    description: string | null;
    type: string;
    value: string | null;
  }>(
    `SELECT id, name, description, type::text, value::text
     FROM "Promotion"
     WHERE "organizationId" = $1
       AND status = 'ACTIVE'
       AND "deletedAt" IS NULL
       AND "customerId" IS NULL
       AND ("startsAt" IS NULL OR "startsAt" <= NOW())
       AND ("endsAt" IS NULL OR "endsAt" >= NOW())
     ORDER BY name
     LIMIT 100`,
    [organizationId],
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type,
    value: row.value != null ? parseFloat(row.value) : null,
  }));
}
