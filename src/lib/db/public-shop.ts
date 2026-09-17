import { slugifyLabel } from "@/lib/booking-qr";
import { writeAuditLog } from "@/lib/db/audit";
import { findOrCreateCustomerByPhone } from "@/lib/db/customers";
import { emitNotification } from "@/lib/db/notifications";
import { resolveOrganizationBySlug } from "@/lib/db/public-booking";
import type {
  PublicProductItem,
  PublicProductOrderInput,
  PublicProductOrderResult,
} from "@/types/public-booking";
import { randomBytes } from "crypto";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

function digitsPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("0") && d.length >= 9) return `212${d.slice(1)}`;
  if (d.startsWith("212")) return d;
  return d;
}

function mapProduct(r: {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  salePrice: string;
  unit: string;
  stock: string;
  notes: string | null;
}): PublicProductItem {
  const stock = parseFloat(r.stock) || 0;
  return {
    id: r.id,
    name: r.name,
    slug: slugifyLabel(r.name),
    brand: r.brand,
    category: r.category,
    salePrice: parseFloat(r.salePrice) || 0,
    unit: r.unit,
    inStock: stock > 0,
    notes: r.notes,
  };
}

export async function getPublicProducts(
  organizationId: string,
): Promise<PublicProductItem[]> {
  const { rows } = await pool.query<{
    id: string;
    name: string;
    brand: string | null;
    category: string;
    salePrice: string;
    unit: string;
    stock: string;
    notes: string | null;
  }>(
    `SELECT p.id, p.name, p.brand, p.category::text, p."salePrice"::text,
            p.unit::text, p.stock::text, p.notes
     FROM "Product" p
     WHERE p."organizationId" = $1
       AND p.active = true
       AND p.sellable = true
       AND p."deletedAt" IS NULL
       AND p."salePrice" IS NOT NULL
       AND p."salePrice" > 0
     ORDER BY p.name
     LIMIT 200`,
    [organizationId],
  );

  return rows.map(mapProduct);
}

export async function resolvePublicProductRef(
  organizationId: string,
  ref: string,
): Promise<PublicProductItem | null> {
  const products = await getPublicProducts(organizationId);
  const needle = ref.trim().toLowerCase();
  if (!needle) return null;
  return (
    products.find((p) => p.id.toLowerCase() === needle) ??
    products.find((p) => p.slug === needle) ??
    null
  );
}

export async function createPublicProductOrder(
  slug: string,
  input: PublicProductOrderInput,
): Promise<PublicProductOrderResult> {
  const org = await resolveOrganizationBySlug(slug);
  if (!org) throw new Error("Institut introuvable.");

  if (!input.lines?.length) throw new Error("Panier vide.");
  if (!input.customer?.firstName?.trim() || !input.customer?.lastName?.trim()) {
    throw new Error("Nom et prénom requis.");
  }
  if (!input.customer?.phone?.trim() || input.customer.phone.replace(/\D/g, "").length < 8) {
    throw new Error("Téléphone invalide.");
  }

  const qtyByProduct = new Map<string, number>();
  for (const line of input.lines) {
    const q = Math.floor(Number(line.quantity));
    if (!line.productId || !Number.isFinite(q) || q <= 0 || q > 20) {
      throw new Error("Quantité invalide.");
    }
    qtyByProduct.set(line.productId, (qtyByProduct.get(line.productId) ?? 0) + q);
  }
  if (qtyByProduct.size > 30) throw new Error("Trop de produits dans la demande.");

  const productIds = Array.from(qtyByProduct.keys());
  const { rows: products } = await pool.query<{
    id: string;
    name: string;
    salePrice: string;
    stock: string;
  }>(
    `SELECT id, name, "salePrice"::text, stock::text
     FROM "Product"
     WHERE "organizationId" = $1
       AND id = ANY($2::text[])
       AND active = true
       AND sellable = true
       AND "deletedAt" IS NULL
       AND "salePrice" IS NOT NULL
       AND "salePrice" > 0`,
    [org.id, productIds],
  );

  if (products.length !== productIds.length) {
    throw new Error("Un ou plusieurs produits ne sont plus disponibles.");
  }

  const lines: PublicProductOrderResult["lines"] = [];
  let total = 0;
  for (const p of products) {
    const qty = qtyByProduct.get(p.id) ?? 0;
    const stock = parseFloat(p.stock) || 0;
    if (stock < qty) {
      throw new Error(`Stock insuffisant pour « ${p.name} ».`);
    }
    const unitPrice = parseFloat(p.salePrice) || 0;
    const lineTotal = unitPrice * qty;
    total += lineTotal;
    lines.push({
      productId: p.id,
      name: p.name,
      quantity: qty,
      unitPrice,
      lineTotal,
    });
  }

  const { customerId } = await findOrCreateCustomerByPhone(org.id, {
    firstName: input.customer.firstName.trim(),
    lastName: input.customer.lastName.trim(),
    phone: input.customer.phone.trim(),
    email: input.customer.email?.trim() || null,
    marketingOptIn: Boolean(input.customer.marketingOptIn),
  });

  const orderId = newId("pord");
  const customerName =
    `${input.customer.firstName.trim()} ${input.customer.lastName.trim()}`.trim();

  await writeAuditLog({
    organizationId: org.id,
    actorId: null,
    actorName: customerName,
    entityType: "ProductOrderRequest",
    entityId: orderId,
    action: "PRODUCT_ORDER_REQUEST",
    after: {
      orderId,
      customerId,
      customerName,
      phone: input.customer.phone.trim(),
      email: input.customer.email?.trim() || null,
      lines,
      total,
      notes: input.notes?.trim() || null,
      fulfillment: "CLICK_COLLECT",
      payment: "AT_INSTITUTE",
    },
  });

  const linesText = lines
    .map((l) => `• ${l.quantity}× ${l.name} (${Math.round(l.lineTotal)} MAD)`)
    .join("\n");

  try {
    await emitNotification({
      organizationId: org.id,
      type: "SYSTEM",
      title: "Demande boutique en ligne",
      message: `${customerName} souhaite retirer ${lines.length} produit(s) — ${Math.round(total)} MAD. Paiement à l’institut.`,
      eventKey: `product_order_request:${orderId}`,
      entityType: "Customer",
      entityId: customerId,
      severity: "INFO",
      recipientRoles: ["OWNER", "MANAGER"],
      metadata: {
        orderId,
        total,
        linesCount: lines.length,
        source: "public_book_shop",
      },
    });
  } catch {
    /* non bloquant */
  }

  const waBody = [
    `Bonjour ${org.name},`,
    ``,
    `Je souhaite réserver ces produits (click & collect) :`,
    linesText,
    ``,
    `Total estimé : ${Math.round(total)} MAD`,
    `Cliente : ${customerName}`,
    `Tél : ${input.customer.phone.trim()}`,
    input.notes?.trim() ? `Note : ${input.notes.trim()}` : null,
    ``,
    `Réf. demande : ${orderId}`,
    `Paiement à l’institut.`,
  ]
    .filter(Boolean)
    .join("\n");

  let whatsappUrl: string | null = null;
  if (org.phone) {
    const phone = digitsPhone(org.phone);
    if (phone.length >= 10) {
      whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(waBody)}`;
    }
  }

  return {
    orderId,
    customerId,
    total,
    lines,
    whatsappUrl,
    message:
      "Demande enregistrée. Paiement et retrait à l’institut — confirmez via WhatsApp si possible.",
  };
}
