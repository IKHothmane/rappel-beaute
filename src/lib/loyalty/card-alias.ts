/**
 * Suivi d'alias des cartes fidélité (fusion de fiches confirmée par le personnel).
 *
 * Une carte fusionnée passe en status 'MERGED' avec "mergedIntoCardId" = carte survivante. Elle garde son
 * jeton public, son code court et ses passes Wallet : toute lecture PAR JETON doit donc suivre l'alias
 * (profondeur 1) et travailler sur la carte survivante. Ce suivi est actif en permanence, indépendamment
 * du drapeau LOYALTY_MERGE_ENABLED qui ne protège que les routes de fusion.
 *
 * Fichier volontairement sans dépendance (ni base, ni autre module fidélité) : il ne contient que des
 * fragments SQL, importables partout sans être touchés par les doublures de tests de cards.ts.
 */

/** Statuts qui portent un jeton public encore utilisable. */
export const TOKEN_CARD_STATUSES_SQL = `('ACTIVE', 'MERGED')`;

/**
 * Fragment de jointure : `survivor` est la carte effective (ACTIVE) du jeton porté par `holder`.
 *
 *   FROM "LoyaltyCard" lc
 *   <aliasJoin()>
 *   WHERE al."publicToken" = $1 AND lc.status = 'ACTIVE'
 *
 * - carte ACTIVE : holder = survivor (mergedIntoCardId est NULL) ;
 * - carte MERGED : survivor = mergedIntoCardId, dans le même institut.
 * Les arguments sont des identifiants SQL internes (jamais des entrées utilisateur).
 */
export function aliasJoin(holder = "al", survivor = "lc"): string {
  return `JOIN "LoyaltyCard" ${holder}
       ON ${survivor}.id = COALESCE(${holder}."mergedIntoCardId", ${holder}.id)
      AND ${survivor}."organizationId" = ${holder}."organizationId"
      AND ${holder}.status IN ('ACTIVE', 'MERGED')`;
}

/** Carte effective d'un id de carte (alias ou non) : COALESCE(mergedIntoCardId, id). */
export function effectiveCardIdSql(column: string): string {
  return `COALESCE(${column}."mergedIntoCardId", ${column}.id)`;
}
