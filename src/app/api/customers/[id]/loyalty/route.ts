import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureRead } from "@/lib/auth/api-guard";
import { getCustomerLoyalty, listPackages } from "@/lib/db/loyalty";
import { listPayments } from "@/lib/db/finance";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureRead(request, "customers");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const section = url.searchParams.get("section") || "loyalty";

    if (section === "packages") {
      const packages = await listPackages(auth.session.organizationId, {
        customerId: id,
      });
      return NextResponse.json({ data: packages });
    }

    if (section === "payments") {
      const payments = await listPayments(auth.session.organizationId, {
        customerId: id,
        limit: 50,
      });
      return NextResponse.json({ data: payments });
    }

    const loyalty = await getCustomerLoyalty(auth.session.organizationId, id);
    return NextResponse.json(loyalty);
  } catch (error) {
    console.error("[GET /api/customers/:id/loyalty]", error);
    return NextResponse.json(
      { error: "Impossible de charger la fidélité cliente." },
      { status: 500 },
    );
  }
}
