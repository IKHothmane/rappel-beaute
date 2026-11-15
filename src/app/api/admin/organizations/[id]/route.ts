import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import { readJsonObject } from "@/lib/admin/read-json-object";
import {
  getOrganizationById,
  updateOrganization,
} from "@/lib/db/admin-organizations";
import { getOrganizationInsights } from "@/lib/db/admin-org-cards";
import { listOrganizationPaymentHistory } from "@/lib/db/organization-payment-history";
import { platformRoute } from "@/lib/http/route-scope";

type Ctx = { params: Promise<{ id: string }> };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_LENGTH = { name: 200, phone: 40, email: 254, address: 300, city: 120 } as const;
const FIELDS = ["name", "phone", "email", "address", "city"] as const;
type Field = (typeof FIELDS)[number];
const LABELS: Record<Field, string> = {
  name: "Le nom", phone: "Le téléphone", email: "L'e-mail", address: "L'adresse", city: "La ville",
};

/**
 * Validates the PATCH body. `name` must not be blank when sent. Blank optional fields
 * (the edit form sends "" for empty inputs) are dropped, never written over stored data.
 */
function parseOrganizationPatch(body: Record<string, unknown>):
  | { ok: true; patch: Partial<Record<Field, string>> }
  | { ok: false; error: string } {
  const patch: Partial<Record<Field, string>> = {};
  for (const field of FIELDS) {
    const value = body[field];
    if (value === undefined || value === null) continue;
    if (typeof value !== "string") return { ok: false, error: `${LABELS[field]} est invalide.` };
    const trimmed = value.trim();
    if (trimmed.length > MAX_LENGTH[field]) return { ok: false, error: `${LABELS[field]} est trop long.` };
    if (!trimmed) {
      if (field === "name") return { ok: false, error: "Le nom est obligatoire." };
      continue;
    }
    if (field === "email" && !EMAIL.test(trimmed)) return { ok: false, error: "Adresse e-mail invalide." };
    patch[field] = trimmed;
  }
  return { ok: true, patch };
}

export const GET = platformRoute(async function GET(request: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  // Existence first: no insights query for an unknown id.
  const org = await getOrganizationById(id);
  if (!org) return adminError("Institut introuvable.", 404);

  let paymentHistoryAvailable = true;
  const [insights, paymentHistory] = await Promise.all([
    getOrganizationInsights(id),
    listOrganizationPaymentHistory(id).catch((error) => {
      // The history is secondary: the detail must still load without it.
      console.error("[GET /api/admin/organizations/:id] payment history", error);
      paymentHistoryAvailable = false;
      return [];
    }),
  ]);
  return adminJson({ organization: org, insights, paymentHistory, paymentHistoryAvailable });
});

export const PATCH = platformRoute(async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = await readJsonObject(request);
  if (!body) return adminError("Corps JSON invalide.", 400);
  if (body.organizationId) return adminError("Paramètre organizationId interdit.", 400);

  const parsed = parseOrganizationPatch(body);
  if (!parsed.ok) return adminError(parsed.error, 400);
  if (Object.keys(parsed.patch).length === 0) return adminError("Aucune modification à enregistrer.", 400);

  try {
    await updateOrganization(auth.session, id, parsed.patch);
    const org = await getOrganizationById(id);
    return adminJson({ organization: org });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return adminError("Institut introuvable.", 404);
    }
    console.error("[PATCH /api/admin/organizations/:id]", e);
    return adminError("Mise à jour impossible.", 500);
  }
});
