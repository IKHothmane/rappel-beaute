/** Code saisi au comptoir : 4 caractères, jamais le jeton RBLOY complet. */
export function shortCardCode(token: string) {
  const upper = token.trim().toUpperCase();
  const body = upper.startsWith("RBLOY_") ? upper.slice("RBLOY_".length) : upper.replace(/[^A-Z2-9]/g, "");
  return body.slice(-4);
}
