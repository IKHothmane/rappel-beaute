import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  createWhatsAppTemplate,
  listWhatsAppTemplates,
  updateWhatsAppTemplate,
} from "@/lib/db/whatsapp";
import { canWriteWhatsappTemplates } from "@/lib/rbac";
import { parseWhatsAppAction } from "@/lib/validation/whatsapp";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "whatsapp");
  if (!auth.ok) return auth.response;
  try {
    const templates = await listWhatsAppTemplates(auth.session.organizationId);
    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error("[GET /api/whatsapp/templates]", error);
    return NextResponse.json({ error: "Impossible de charger les modèles." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "whatsapp");
  if (!auth.ok) return auth.response;
  if (!canWriteWhatsappTemplates(auth.session.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const parsed = parseWhatsAppAction(raw);
    const actor = {
      id: auth.session.id,
      name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    };

    if (parsed.action === "createTemplate") {
      const tpl = await createWhatsAppTemplate(
        auth.session.organizationId,
        parsed.data,
        actor,
      );
      return NextResponse.json(tpl, { status: 201 });
    }

    if (parsed.action === "updateTemplate") {
      const tpl = await updateWhatsAppTemplate(
        auth.session.organizationId,
        parsed.data,
        actor,
      );
      if (!tpl) {
        return NextResponse.json({ error: "Modèle introuvable." }, { status: 404 });
      }
      return NextResponse.json(tpl);
    }

    return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/whatsapp/templates]", error);
    return NextResponse.json({ error: "Impossible de sauvegarder le modèle." }, { status: 500 });
  }
}
