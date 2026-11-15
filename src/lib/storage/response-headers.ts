/**
 * En-têtes de service d'un fichier uploadé. Les fichiers sont servis depuis
 * l'origine de l'application : tout contenu actif (SVG) est neutralisé si l'URL
 * est ouverte directement (CSP sandbox sans script). Un affichage en <img>
 * n'est pas affecté. Pas de Content-Disposition: attachment pour garder
 * l'aperçu direct des logos.
 */
export function storageResponseHeaders(contentType: string | undefined): Record<string, string> {
  return {
    "Content-Type": contentType ?? "application/octet-stream",
    // Pas d’immutable : les clés stables sont écrasées au re-upload.
    "Cache-Control": "public, max-age=86400, must-revalidate",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  };
}
