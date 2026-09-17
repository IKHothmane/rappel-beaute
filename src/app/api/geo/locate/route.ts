import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IpLocateResult = {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
  label: string;
};

function clientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip")?.trim();
  return real || null;
}

function isLocalIp(ip: string | null): boolean {
  if (!ip) return true;
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("172.17.") ||
    ip.startsWith("172.18.") ||
    ip.startsWith("172.19.") ||
    ip.startsWith("172.2") ||
    ip.startsWith("172.3")
  );
}

async function locateByIp(ip: string | null): Promise<IpLocateResult | null> {
  // ip-api.com : gratuit, JSON, OK depuis serveur (pas localhost IP)
  const endpoint = ip && !isLocalIp(ip)
    ? `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,lat,lon,city,regionName,country&lang=fr`
    : `http://ip-api.com/json/?fields=status,message,lat,lon,city,regionName,country&lang=fr`;

  const res = await fetch(endpoint, { cache: "no-store" });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    status: string;
    lat?: number;
    lon?: number;
    city?: string;
    regionName?: string;
    country?: string;
  };

  if (data.status !== "success" || data.lat == null || data.lon == null) return null;

  const parts = [data.city, data.regionName, data.country].filter(Boolean);
  return {
    latitude: data.lat,
    longitude: data.lon,
    city: data.city,
    region: data.regionName,
    country: data.country,
    label: parts.join(", ") || `${data.lat.toFixed(5)}, ${data.lon.toFixed(5)}`,
  };
}

async function reverse(lat: number, lon: number): Promise<string | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("accept-language", "fr");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "RappelBeauty/1.0 (professionnel-form)",
    },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
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
    };
  };

  const a = data.address;
  if (a) {
    const street = [a.house_number, a.road || a.pedestrian].filter(Boolean).join(" ");
    const area = a.neighbourhood || a.suburb || a.quarter || a.city_district;
    const city = a.city || a.town || a.village;
    const parts = [street, area, city].filter(Boolean);
    if (parts.length) return parts.join(", ");
  }

  return data.display_name?.split(",").slice(0, 3).join(",").trim() ?? null;
}

/**
 * GET /api/geo/locate
 * ?lat=&lon= → reverse uniquement
 * sans params → approx IP + reverse
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");

    if (latParam && lonParam) {
      const latitude = Number(latParam);
      const longitude = Number(lonParam);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return NextResponse.json({ error: "Coordonnées invalides" }, { status: 400 });
      }
      const address = await reverse(latitude, longitude);
      return NextResponse.json({
        source: "gps",
        latitude,
        longitude,
        address:
          address ??
          `Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`,
        mapsUrl: `https://www.google.com/maps?q=${latitude},${longitude}`,
      });
    }

    const ip = clientIp(req);
    const located = await locateByIp(ip);
    if (!located) {
      return NextResponse.json(
        {
          error:
            "Position indisponible en local. Activez la localisation Windows + navigateur, ou saisissez l'adresse.",
        },
        { status: 422 },
      );
    }

    const address =
      (await reverse(located.latitude, located.longitude)) ?? located.label;

    return NextResponse.json({
      source: "ip",
      latitude: located.latitude,
      longitude: located.longitude,
      address,
      mapsUrl: `https://www.google.com/maps?q=${located.latitude},${located.longitude}`,
    });
  } catch {
    return NextResponse.json({ error: "Service de localisation indisponible" }, { status: 502 });
  }
}
