import { pool } from "@/lib/db/pool";

/** Données d'affichage supplémentaires pour les cartes « Instituts » du back-office. */
type OrganizationCardExtra = {
  coverUrl: string | null;
  /** Arrière-plan de la carte de fidélité (null = fond par défaut). */
  cardBackgroundUrl: string | null;
  staffCount: number;
  rating: number | null;
  reviewCount: number;
};

export async function listOrganizationCardExtras(): Promise<Record<string, OrganizationCardExtra>> {
  const { rows } = await pool.query<{
    id: string;
    cover: string | null;
    cardBg: string | null;
    staff: string;
    rating: string | null;
    reviews: string;
  }>(
    `SELECT o.id,
      COALESCE(
        (SELECT lp."cardBackgroundUrl" FROM "LoyaltyProgram" lp WHERE lp."organizationId" = o.id),
        (SELECT sv."imageUrl" FROM "Service" sv
           WHERE sv."organizationId" = o.id AND sv."imageUrl" IS NOT NULL
           ORDER BY sv."createdAt" ASC LIMIT 1)
      ) AS cover,
      (SELECT lp2."cardBackgroundUrl" FROM "LoyaltyProgram" lp2 WHERE lp2."organizationId" = o.id) AS "cardBg",
      (SELECT COUNT(*)::text FROM "Staff" s
         WHERE s."organizationId" = o.id AND s.status = 'ACTIVE' AND s."deletedAt" IS NULL) AS staff,
      (SELECT ROUND(AVG(r.rating)::numeric, 1)::text FROM "Review" r
         WHERE r."organizationId" = o.id AND r.status = 'PUBLISHED' AND r.rating IS NOT NULL) AS rating,
      (SELECT COUNT(*)::text FROM "Review" r
         WHERE r."organizationId" = o.id AND r.status = 'PUBLISHED' AND r.rating IS NOT NULL) AS reviews
     FROM "Organization" o`,
  );
  const out: Record<string, OrganizationCardExtra> = {};
  for (const r of rows) {
    out[r.id] = {
      coverUrl: r.cover,
      cardBackgroundUrl: r.cardBg,
      staffCount: parseInt(r.staff, 10),
      rating: r.rating != null ? parseFloat(r.rating) : null,
      reviewCount: parseInt(r.reviews, 10),
    };
  }
  return out;
}

type OrganizationInsights = {
  services: { name: string; category: string | null }[];
  team: { name: string; position: string | null }[];
  /** 6 derniers mois, du plus ancien au plus récent (revenu net des remboursements). */
  revenueSeries: { month: string; label: string; value: number }[];
  revenueThisMonth: number;
  revenuePreviousMonth: number;
};

const MONTH_FMT = new Intl.DateTimeFormat("fr-FR", { month: "short" });

export async function getOrganizationInsights(id: string): Promise<OrganizationInsights> {
  const [services, team, revenue] = await Promise.all([
    pool.query<{ name: string; category: string | null }>(
      `SELECT name, category FROM "Service"
       WHERE "organizationId" = $1 AND active = true
       ORDER BY name ASC LIMIT 12`,
      [id],
    ),
    pool.query<{ first: string; last: string; position: string | null }>(
      `SELECT "firstName" AS first, "lastName" AS last, position FROM "Staff"
       WHERE "organizationId" = $1 AND status = 'ACTIVE' AND "deletedAt" IS NULL
       ORDER BY "createdAt" ASC LIMIT 6`,
      [id],
    ),
    pool.query<{ m: string; total: string }>(
      `SELECT to_char(date_trunc('month', "paidAt"), 'YYYY-MM') AS m,
              COALESCE(SUM(CASE WHEN kind = 'REFUND' THEN -amount ELSE amount END), 0)::text AS total
       FROM "Payment"
       WHERE "organizationId" = $1 AND status = 'COMPLETED'
         AND "paidAt" >= date_trunc('month', now()) - interval '5 months'
       GROUP BY 1`,
      [id],
    ),
  ]);

  const byMonth = new Map(revenue.rows.map((r) => [r.m, parseFloat(r.total)]));
  const now = new Date();
  const series: OrganizationInsights["revenueSeries"] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    series.push({
      month: key,
      label: MONTH_FMT.format(d).replace(".", ""),
      value: byMonth.get(key) ?? 0,
    });
  }

  return {
    services: services.rows,
    team: team.rows.map((r) => ({
      name: `${r.first} ${r.last}`.trim(),
      position: r.position,
    })),
    revenueSeries: series,
    revenueThisMonth: series[5]?.value ?? 0,
    revenuePreviousMonth: series[4]?.value ?? 0,
  };
}
