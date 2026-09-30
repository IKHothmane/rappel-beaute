export type MapPoint = { lat: number; lng: number };

const CITIES: Record<string, MapPoint> = {
  casablanca: { lat: 33.5731, lng: -7.5898 },
  rabat: { lat: 34.0209, lng: -6.8416 },
  sale: { lat: 34.0531, lng: -6.7985 },
  temara: { lat: 33.9287, lng: -6.9066 },
  mohammedia: { lat: 33.6866, lng: -7.383 },
  marrakech: { lat: 31.6295, lng: -7.9811 },
  fes: { lat: 34.0181, lng: -5.0078 },
  meknes: { lat: 33.8935, lng: -5.5473 },
  tanger: { lat: 35.7595, lng: -5.834 },
  agadir: { lat: 30.4278, lng: -9.5981 },
  oujda: { lat: 34.6814, lng: -1.9086 },
  kenitra: { lat: 34.261, lng: -6.5802 },
  tetouan: { lat: 35.5889, lng: -5.3626 },
  safi: { lat: 32.2994, lng: -9.2372 },
  "el jadida": { lat: 33.2316, lng: -8.5007 },
  nador: { lat: 35.1681, lng: -2.9335 },
  "beni mellal": { lat: 32.3373, lng: -6.3498 },
  khouribga: { lat: 32.8811, lng: -6.9063 },
  settat: { lat: 33.001, lng: -7.6164 },
  larache: { lat: 35.1932, lng: -6.1557 },
  khemisset: { lat: 33.824, lng: -6.0665 },
  essaouira: { lat: 31.5085, lng: -9.7595 },
  ouarzazate: { lat: 30.9335, lng: -6.937 },
  taza: { lat: 34.2133, lng: -4.01 },
  errachidia: { lat: 31.9314, lng: -4.424 },
  ifrane: { lat: 33.5228, lng: -5.1106 },
  chefchaouen: { lat: 35.1714, lng: -5.2696 },
  martil: { lat: 35.6167, lng: -5.275 },
  dakhla: { lat: 23.6848, lng: -15.957 },
  laayoune: { lat: 27.1253, lng: -13.1625 },
};

export const MOROCCO_CENTER: MapPoint = { lat: 31.8, lng: -7.1 };

export function normalizePlace(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .trim();
}

export function cityCoordinates(city: string | null | undefined): MapPoint | null {
  if (!city) return null;
  const key = normalizePlace(city);
  if (CITIES[key]) return CITIES[key];
  const hit = Object.keys(CITIES).find((name) => key.includes(name) || name.includes(key));
  return hit ? CITIES[hit] : null;
}

export function mapEmbedUrl(point: MapPoint | null, zoom: "city" | "country" = "city") {
  if (!point || zoom === "country") {
    return "https://www.openstreetmap.org/export/embed.html?bbox=-17.2%2C21.0%2C-1.0%2C35.9&layer=mapnik";
  }
  const span = zoom === "city" ? 0.12 : 0.45;
  const left = point.lng - span;
  const right = point.lng + span;
  const bottom = point.lat - span * 0.7;
  const top = point.lat + span * 0.7;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${point.lat}%2C${point.lng}`;
}
