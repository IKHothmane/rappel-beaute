import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWriteLimited,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { canEditCustomerMarketing } from "@/lib/rbac";
import {
  getCustomerById,
  getCustomerHistory,
  isUniqueViolation,
  updateCustomer,
} from "@/lib/db/customers";
import { validateUpdateCustomer } from "@/lib/validation/customer";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureRead(request, "customers");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const includeHistory = searchParams.get("history") === "1";

  try {
    const customer = await getCustomerById(id, auth.session.organizationId);
    if (!customer) {
      return NextResponse.json({ error: "Cliente introuvable." }, { status: 404 });
    }

    if (includeHistory) {
      const history = await getCustomerHistory(id, auth.session.organizationId);
      return NextResponse.json({ customer, history });
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error(`[GET /api/customers/${id}]`, error);
    return NextResponse.json(
      { error: "Impossible de charger la cliente." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureWriteLimited(request, "customers");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const raw = stripOrganizationId(
      (await request.json()) as Record<string, unknown>,
    );
    const validated = validateUpdateCustomer(raw);
    if (!validated.ok) {
      return NextResponse.json({ error: "Données invalides.", details: validated.errors }, { status: 400 });
    }

    let input = validated.data;
    if (!canEditCustomerMarketing(auth.session.role)) {
      delete input.marketingWhatsapp;
      delete input.marketingEmail;
      delete input.marketingSms;
    }

    const customer = await updateCustomer(id, auth.session.organizationId, input);
    if (!customer) {
      return NextResponse.json({ error: "Cliente introuvable." }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "Une cliente avec ce numéro existe déjà dans votre institut." },
        { status: 409 },
      );
    }
    console.error(`[PATCH /api/customers/${id}]`, error);
    return NextResponse.json(
      { error: "Impossible de mettre à jour la cliente." },
      { status: 500 },
    );
  }
}

/** Pas de DELETE — archivage via PATCH { archived: true } */
