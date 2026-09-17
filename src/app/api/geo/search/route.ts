import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NominatimItem = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    pedestrian?: string;
    neighbourhood?: string;
    suburb?: string;
    city_district?: string;
    quarter?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    country?: string;
  };
};

function formatLabel(item: NominatimItem): string {
  const a = item.address;
  if (!a) return item.display_name.split(",").slice(0, 4).join(",").trim();

  const street = [a.house_number, a.road || a.pedestrian].filter(Boolean).join(" ");
  const area = a.neighbourhood || a.suburb || a.quarter || a.city_district;
  const city = a.city || a.town || a.village || a.municipality;
  const parts = [street, area, city, a.state].filter(Boolean);
  return parts.length ? parts.join(", ") : item.display_name.split(",").slice(0, 4).join(",").trim();
}

/**
 * GET /api/geo/search?q=avenue+anfa+casablanca
 * Suggestions OpenStreetMap (Nominatim)
 */
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 3) {
      return NextResponse.json({ suggestions: [] });
    }

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("q", q);
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "6");
    url.searchParams.set("countrycodes", "ma");
    url.searchParams.set("accept-language", "fr");

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "RappelBeauty/1.0 (professionnel-form)",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Recherche indisponible" }, { status: 502 });
    }

    const items = (await res.json()) as NominatimItem[];
    const suggestions = items.map((item) => {
      const latitude = Number(item.lat);
      const longitude = Number(item.lon);
      const label = formatLabel(item);
      return {
        id: String(item.place_id),
        label,
        full: item.display_name,
        latitude,
        longitude,
        mapsUrl: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`,
      };
    });

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ error: "Recherche indisponible" }, { status: 502 });
  }
}
