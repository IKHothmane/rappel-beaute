import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import {
  getPlatformDashboardStats,
  listOrganizations,
} from "@/lib/db/admin-organizations";
import { listOrganizationCardExtras } from "@/lib/db/admin-org-cards";
import type { OrganizationStatus, SubscriptionPlan } from "@/types/platform";
import { platformRoute } from "@/lib/http/route-scope";

export const GET = platformRoute(async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const sp = request.nextUrl.searchParams;
  const search = sp.get("search") ?? undefined;
  const status = sp.get("status") as OrganizationStatus | null;
  const plan = sp.get("plan") as SubscriptionPlan | null;

  const [items, extras] = await Promise.all([
    listOrganizations({
      search,
      status: status ?? undefined,
      plan: plan ?? undefined,
    }),
    listOrganizationCardExtras(),
  ]);
  return adminJson({
    items: items.map((org) => ({
      ...org,
      coverUrl: extras[org.id]?.coverUrl ?? null,
      cardBackgroundUrl: extras[org.id]?.cardBackgroundUrl ?? null,
      staffCount: extras[org.id]?.staffCount ?? 0,
      rating: extras[org.id]?.rating ?? null,
      reviewCount: extras[org.id]?.reviewCount ?? 0,
    })),
  });
});

export const POST = platformRoute(async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (body.organizationId) return adminError("Paramètre organizationId interdit.", 400);

    const { createOrganization } = await import("@/lib/db/admin-organizations");
    const result = await createOrganization(auth.session, {
      name: String(body.name ?? ""),
      slug: String(body.slug ?? ""),
      phone: String(body.phone ?? ""),
      email: String(body.email ?? ""),
      address: body.address != null ? String(body.address) : null,
      city: body.city != null ? String(body.city) : null,
      owner: {
        firstName: String((body.owner as Record<string, unknown>)?.firstName ?? ""),
        lastName: String((body.owner as Record<string, unknown>)?.lastName ?? ""),
        email: String((body.owner as Record<string, unknown>)?.email ?? ""),
        phone:
          (body.owner as Record<string, unknown>)?.phone != null
            ? String((body.owner as Record<string, unknown>).phone)
            : null,
      },
      plan: String(body.plan ?? "INSTITUT") as SubscriptionPlan,
    });

    return adminJson({ ok: true, ...result }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur";
    if (msg === "SLUG_TAKEN") return adminError("Ce slug est déjà utilisé.", 409);
    if (msg === "OWNER_EMAIL_TAKEN") return adminError("Cet e-mail est déjà utilisé.", 409);
    console.error("[POST /api/admin/organizations]", e);
    return adminError("Impossible de créer l'institut.", 500);
  }
});

export const HEAD = platformRoute(async function HEAD(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const stats = await getPlatformDashboardStats();
  return adminJson({ stats });
});
