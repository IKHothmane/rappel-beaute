/** Compteur du cycle en cours. À 10, 20, 30… il revient à 0. */
export function visitCycle(visits: number, threshold: number) {
  if (!threshold || threshold <= 0) return 0;
  return ((visits % threshold) + threshold) % threshold;
}

/** Code saisi au comptoir : 4 caractères, jamais le jeton RBLOY complet. */
export function shortCardCode(token: string) {
  const upper = token.trim().toUpperCase();
  const body = upper.startsWith("RBLOY_") ? upper.slice("RBLOY_".length) : upper.replace(/[^A-Z2-9]/g, "");
  return body.slice(-4);
}
