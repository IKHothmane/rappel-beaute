/** Helpers & placeholders visuels pour le mini-site public (images absentes en DB). */

export function bookHref(slug: string, path = "") {
  const base = `/book/${encodeURIComponent(slug)}`;
  if (!path || path === "/") return `${base}/`;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p.endsWith("/") || p.includes("?") ? p : `${p}/`}`;
}

export const PUBLIC_SITE = {
  accent: "#B76E79",
  accentHover: "#9F5C67",
  ink: "#241A22",
  muted: "#746970",
  softBg: "#F9ECE9",
  pageBg: "#FFFDFC",
  border: "#EBDDE4",
} as const;

const SERVICE_IMAGES = [
  "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=80",
];

const PRODUCT_IMAGES = [
  "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1571781926291-c77df809b1c4?auto=format&fit=crop&w=900&q=80",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function servicePlaceholderImage(id: string) {
  return SERVICE_IMAGES[hash(id) % SERVICE_IMAGES.length]!;
}

export function productPlaceholderImage(id: string) {
  return PRODUCT_IMAGES[hash(id) % PRODUCT_IMAGES.length]!;
}

export const HERO_IMAGE =
  "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=85";

export const SERVICES_HERO_IMAGE =
  "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=1400&q=80";

export const PRODUCTS_HERO_IMAGE =
  "https://images.unsplash.com/photo-1596462502278-27bfdd403348?auto=format&fit=crop&w=1400&q=80";
