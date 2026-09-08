import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureRead } from "@/lib/auth/api-guard";
import { slugifyLabel, buildPublicBookingUrl } from "@/lib/booking-qr";
import { getQrBookingStats } from "@/lib/db/public-booking-events";
import { listServices } from "@/lib/db/services";
import { listStaff } from "@/lib/db/staff";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "settings");
  if (!auth.ok) return auth.response;

  try {
    const orgId = auth.session.organizationId;
    const { rows } = await pool.query<{ slug: string; name: string }>(
      `SELECT slug, name FROM "Organization" WHERE id = $1`,
      [orgId],
    );
    const org = rows[0];
    if (!org) {
      return NextResponse.json({ error: "Organisation introuvable." }, { status: 404 });
    }

    const [servicesRes, staffRes, stats] = await Promise.all([
      listServices(orgId, { page: 1, limit: 200, active: true }),
      listStaff(orgId, { page: 1, limit: 100, agenda: true }),
      getQrBookingStats(orgId),
    ]);

    const services = servicesRes.items.map((s) => ({
      id: s.id,
      name: s.name,
      slug: slugifyLabel(s.name),
      url: buildPublicBookingUrl({
        slug: org.slug,
        service: slugifyLabel(s.name),
        source: "qr",
      }),
    }));

    const staff = staffRes.items.map((s) => {
      const label = `${s.firstName} ${s.lastName}`.trim();
      const staffSlug = slugifyLabel(s.firstName);
      return {
        id: s.id,
        name: label,
        slug: staffSlug,
        url: buildPublicBookingUrl({
          slug: org.slug,
          staff: staffSlug,
          source: "qr",
        }),
      };
    });

    const globalUrl = buildPublicBookingUrl({ slug: org.slug, source: "qr" });

    return NextResponse.json({
      organizationName: org.name,
      slug: org.slug,
      globalUrl,
      services,
      staff,
      stats,
    });
  } catch (error) {
    console.error("[GET /api/settings/booking-qr]", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
