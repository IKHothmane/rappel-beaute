import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json({ error: "Coordonnées GPS invalides." }, { status: 400 });
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", "fr");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "RappelBeauty/1.0 (professionnel-form)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Nominatim returned ${response.status}`);
    }

    const data = (await response.json()) as {
      display_name?: string;
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
      };
    };

    const a = data.address;
    let address = data.display_name ?? null;
    if (a) {
      const street = [a.house_number, a.road || a.pedestrian].filter(Boolean).join(" ");
      const area = a.neighbourhood || a.suburb || a.quarter || a.city_district;
      const city = a.city || a.town || a.village || a.municipality;
      const parts = [street, area, city, a.state].filter(Boolean);
      if (parts.length) address = parts.join(", ");
    }

    return NextResponse.json({
      address,
      latitude: lat,
      longitude: lng,
      mapsUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`,
    });
  } catch (error) {
    console.error("[geo/reverse]", error);
    return NextResponse.json({ error: "Impossible de récupérer l'adresse." }, { status: 502 });
  }
}
