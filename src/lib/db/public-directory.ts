import { pool } from "@/lib/db/pool";
import { cityCoordinates, type MapPoint } from "@/lib/geo/morocco-cities";

export type PublicInstitute = {
  slug: string;
  name: string;
  city: string | null;
  address: string | null;
  logoUrl: string | null;
  minPrice: number | null;
  tags: string[];
  point: MapPoint | null;
};

type OrgRow = {
  slug: string;
  name: string;
  city: string | null;
  address: string | null;
  logoUrl: string | null;
};

type ServiceRow = {
  organizationId: string;
  name: string;
  category: string | null;
  price: string;
};

export async function listPublicInstitutes(): Promise<PublicInstitute[]> {
  const { rows: orgs } = await pool.query<OrgRow & { id: string }>(
    `SELECT id, slug, name, city, address, "logoUrl"
     FROM "Organization"
     WHERE status = 'ACTIVE'::"OrganizationStatus"
     ORDER BY name ASC`,
  );
  if (orgs.length === 0) return [];

  const { rows: services } = await pool.query<ServiceRow>(
    `SELECT "organizationId", name, category, price::text AS price
     FROM "Service"
     WHERE active = true AND "organizationId" = ANY($1::text[])`,
    [orgs.map((org) => org.id)],
  );

  const byOrg = new Map<string, ServiceRow[]>();
  for (const service of services) {
    const list = byOrg.get(service.organizationId) ?? [];
    list.push(service);
    byOrg.set(service.organizationId, list);
  }

  return orgs.map((org) => {
    const items = byOrg.get(org.id) ?? [];
    const prices = items
      .map((item) => Number(item.price))
      .filter((price) => Number.isFinite(price));
    const tags = [
      ...new Set(
        items
          .map((item) => (item.category?.trim() || item.name).trim())
          .filter(Boolean),
      ),
    ].slice(0, 3);

    return {
      slug: org.slug,
      name: org.name,
      city: org.city,
      address: org.address,
      logoUrl: org.logoUrl,
      minPrice: prices.length ? Math.min(...prices) : null,
      tags,
      point: cityCoordinates(org.city),
    };
  });
}
