import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWriteLimited,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { canEditCustomerMarketing } from "@/lib/rbac";
import {
  createCustomer,
  isUniqueViolation,
  listCustomers,
} from "@/lib/db/customers";
import {
  parseListQuery,
  validateCreateCustomer,
} from "@/lib/validation/customer";
import { enforceCreateCustomer } from "@/lib/subscriptions/guards";
import type { CustomerStatus } from "@/types/customer";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "customers");
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, search, status, segment } = parseListQuery(searchParams);

    const { items, total, kpis } = await listCustomers(auth.session.organizationId, {
      page,
      limit,
      search: search || undefined,
      status: status as CustomerStatus | null,
      segment,
    });

    return NextResponse.json({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      kpis,
    });
  } catch (error) {
    console.error("[GET /api/customers]", error);
    return NextResponse.json(
      { error: "Impossible de charger les clientes." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWriteLimited(request, "customers");
  if (!auth.ok) return auth.response;

  const limitAuth = await enforceCreateCustomer(request);
  if (!limitAuth.ok) return limitAuth.response;

  try {
    const raw = stripOrganizationId(
      (await request.json()) as Record<string, unknown>,
    );
    const validated = validateCreateCustomer(raw);
    if (!validated.ok) {
      return NextResponse.json({ error: "Données invalides.", details: validated.errors }, { status: 400 });
    }

    let input = validated.data;
    if (!canEditCustomerMarketing(auth.session.role)) {
      input = {
        ...input,
        marketingWhatsapp: false,
        marketingEmail: false,
        marketingSms: false,
      };
    }

    const customer = await createCustomer(auth.session.organizationId, input);
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "Une cliente avec ce numéro existe déjà dans votre institut." },
        { status: 409 },
      );
    }
    console.error("[POST /api/customers]", error);
    return NextResponse.json(
      { error: "Impossible de créer la cliente." },
      { status: 500 },
    );
  }
}
