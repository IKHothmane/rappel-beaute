/**
 * Validation des images téléversées (logos). L'extension du fichier stocké est
 * toujours dérivée du type MIME validé (liste blanche), jamais du nom client.
 */

export const LOGO_MIME_TO_EXT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
} as const;

export type LogoMime = keyof typeof LOGO_MIME_TO_EXT;

/** Types acceptés par les formulaires de logo (GIF non proposé à l'utilisateur). */
export const LOGO_ACCEPTED_MIME: ReadonlySet<string> = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

/** Alias de MIME courants (navigateurs/anciens clients) ramenés au type canonique de la liste blanche. */
const MIME_ALIASES: Record<string, LogoMime> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
};

/**
 * Type MIME déclaré normalisé (minuscules, espaces retirés, alias `image/jpg`, `image/pjpeg`,
 * `image/x-png`). Ne devine rien : un type vide ou inconnu est renvoyé tel quel (donc refusé
 * par les listes blanches).
 */
export function normalizeImageMime(declaredType: string): string {
  const mime = (declaredType ?? "").trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(MIME_ALIASES, mime) ? MIME_ALIASES[mime] : mime;
}

export function extensionForMime(mime: string): string | null {
  return Object.prototype.hasOwnProperty.call(LOGO_MIME_TO_EXT, mime)
    ? LOGO_MIME_TO_EXT[mime as LogoMime]
    : null;
}

function startsWith(buf: Uint8Array, bytes: number[], offset = 0): boolean {
  if (buf.length < offset + bytes.length) return false;
  return bytes.every((b, i) => buf[offset + i] === b);
}

/** Les octets magiques correspondent-ils au type raster déclaré ? */
export function matchesRasterSignature(mime: string, buf: Uint8Array): boolean {
  switch (mime) {
    case "image/png":
      return startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/jpeg":
      return startsWith(buf, [0xff, 0xd8, 0xff]);
    case "image/webp":
      // "RIFF" .... "WEBP"
      return startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8);
    case "image/gif":
      // "GIF87a" / "GIF89a"
      return startsWith(buf, [0x47, 0x49, 0x46, 0x38]) && (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61;
    default:
      return false;
  }
}

const SVG_FORBIDDEN: { re: RegExp; label: string }[] = [
  { re: /<\s*script/i, label: "script" },
  { re: /<\s*foreignobject/i, label: "foreignObject" },
  { re: /<\s*(iframe|embed|object|audio|video)\b/i, label: "élément embarqué" },
  { re: /(java|vb)script\s*:/i, label: "URL script" },
  { re: /data\s*:\s*text\/html/i, label: "data:text/html" },
  { re: /<!\s*entity/i, label: "entité XML" },
];

function isSpace(ch: string | undefined): boolean {
  return ch === " " || ch === "\t" || ch === "\n" || ch === "\r" || ch === "\f";
}

/**
 * Détecte un attribut gestionnaire d'événement (`on…`) à l'intérieur d'une balise, en suivant
 * la grammaire des attributs : le texte, les commentaires, les sections CDATA et le contenu des
 * valeurs entre guillemets ne sont pas des noms d'attribut (« Online = … », fin de base64…).
 * Un guillemet n'ouvre une valeur qu'après `=` (comme un analyseur HTML), ce qui empêche de
 * masquer un gestionnaire derrière un guillemet isolé. Parcours linéaire.
 */
function hasEventHandlerAttribute(text: string): boolean {
  const n = text.length;
  let i = 0;
  while (i < n) {
    const lt = text.indexOf("<", i);
    if (lt === -1) return false;
    i = lt + 1;
    const next = text[i];
    if (next === undefined) return false;
    if (text.startsWith("!--", i)) {
      const end = text.indexOf("-->", i + 3);
      if (end === -1) return false;
      i = end + 3;
      continue;
    }
    if (text.startsWith("![CDATA[", i)) {
      const end = text.indexOf("]]>", i + 8);
      if (end === -1) return false;
      i = end + 3;
      continue;
    }
    if (next === "!" || next === "?") {
      const end = text.indexOf(">", i);
      if (end === -1) return false;
      i = end + 1;
      continue;
    }
    if (isSpace(next)) continue; // « < » dans du texte
    // Nom de balise (balise fermante : « / » puis nom).
    if (text[i] === "/") i++;
    while (i < n && !isSpace(text[i]) && text[i] !== ">" && text[i] !== "/") i++;
    // Attributs.
    while (i < n) {
      while (i < n && (isSpace(text[i]) || text[i] === "/")) i++;
      if (i >= n) return false;
      if (text[i] === ">") {
        i++;
        break;
      }
      const nameStart = i;
      while (i < n && !isSpace(text[i]) && text[i] !== "=" && text[i] !== ">" && text[i] !== "/") i++;
      if (/^on[a-z]+$/i.test(text.slice(nameStart, i))) return true;
      while (i < n && isSpace(text[i])) i++;
      if (text[i] !== "=") continue;
      i++;
      while (i < n && isSpace(text[i])) i++;
      const q = text[i];
      if (q === '"' || q === "'") {
        const end = text.indexOf(q, i + 1);
        if (end === -1) return true; // valeur jamais fermée : contenu douteux, on refuse
        i = end + 1;
      } else {
        while (i < n && !isSpace(text[i]) && text[i] !== ">") i++;
      }
    }
  }
  return false;
}

function decodeCharacterReferences(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);?/gi, (_m, h: string) => safeFromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_m, d: string) => safeFromCodePoint(parseInt(d, 10)));
}

function safeFromCodePoint(cp: number): string {
  try {
    return String.fromCodePoint(cp);
  } catch {
    return "";
  }
}

/**
 * Refuse tout SVG susceptible d'exécuter du code (pas d'assainissement : rejet).
 * Retourne un message d'erreur, ou null si le contenu est acceptable.
 */
export function svgRejectionReason(buf: Uint8Array): string | null {
  if (buf.includes(0)) return "SVG invalide.";
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return "SVG invalide.";
  }
  text = text.replace(/^\uFEFF/, "");
  if (!/<svg[\s>]/i.test(text)) return "SVG invalide.";
  // Neutralise les contournements par références numériques et caractères de contrôle.
  // (les navigateurs ignorent tab/LF/CR à l'intérieur d'un schéma d'URL).
  const decoded = decodeCharacterReferences(text);
  const stripped = decoded.replace(/[\u0000-\u001f\u007f]/g, "");
  for (const candidate of [text, decoded, stripped]) {
    for (const { re } of SVG_FORBIDDEN) {
      if (re.test(candidate)) return "Ce SVG contient du contenu actif non autorisé.";
    }
    if (hasEventHandlerAttribute(candidate)) return "Ce SVG contient du contenu actif non autorisé.";
  }
  return null;
}

export type LogoValidation =
  | { ok: true; contentType: LogoMime; extension: string; filename: string }
  | { ok: false; error: string };

/**
 * Valide un logo : type déclaré dans la liste blanche, octets magiques
 * cohérents (raster), contenu SVG sans éléments actifs. Le nom retourné
 * est construit à partir du MIME validé.
 */
export function validateLogoUpload(
  declaredType: string,
  data: Uint8Array,
  opts: { maxBytes?: number } = {},
): LogoValidation {
  const mime = normalizeImageMime(declaredType);
  if (!LOGO_ACCEPTED_MIME.has(mime)) {
    return { ok: false, error: "Formats acceptés : PNG, JPG, WEBP ou SVG." };
  }
  if (data.length === 0) return { ok: false, error: "Choisissez un fichier image." };
  if (opts.maxBytes != null && data.length > opts.maxBytes) {
    return { ok: false, error: "Le logo ne doit pas dépasser 2 Mo." };
  }
  const ext = extensionForMime(mime);
  if (!ext) return { ok: false, error: "Formats acceptés : PNG, JPG, WEBP ou SVG." };

  if (mime === "image/svg+xml") {
    const reason = svgRejectionReason(data);
    if (reason) return { ok: false, error: reason };
  } else if (!matchesRasterSignature(mime, data)) {
    return { ok: false, error: "Le contenu du fichier ne correspond pas au format image annoncé." };
  }
  return { ok: true, contentType: mime as LogoMime, extension: ext, filename: `logo.${ext}` };
}

export type ImageBytesValidation =
  | { ok: true; contentType: LogoMime; extension: string }
  | { ok: false; error: string };

/**
 * Validation générique avant `storage.put` (ou avant un stockage en data URI) : MIME normalisé
 * dans la liste `accepted`, octets magiques cohérents pour les formats raster, règles de rejet SVG
 * pour `image/svg+xml`. N'impose ni taille ni nom de fichier : à la charge de l'appelant.
 */
export function validateImageBytes(
  declaredType: string,
  data: Uint8Array,
  accepted: ReadonlySet<string>,
): ImageBytesValidation {
  const mime = normalizeImageMime(declaredType);
  const ext = accepted.has(mime) ? extensionForMime(mime) : null;
  if (!ext) return { ok: false, error: "Format d'image non accepté." };
  if (data.length === 0) return { ok: false, error: "Choisissez un fichier image." };
  if (mime === "image/svg+xml") {
    const reason = svgRejectionReason(data);
    if (reason) return { ok: false, error: reason };
  } else if (!matchesRasterSignature(mime, data)) {
    return { ok: false, error: "Le contenu du fichier ne correspond pas au format image annoncé." };
  }
  return { ok: true, contentType: mime as LogoMime, extension: ext };
}
