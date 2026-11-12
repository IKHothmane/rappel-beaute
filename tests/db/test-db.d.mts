export const LOCAL_HOSTS: string[];
export function isLocalUrl(url: string): boolean;
/** Démarre la base locale si besoin ; renvoie la fonction d'arrêt, ou null si elle tournait déjà. */
export function ensureTestDatabase(databaseUrl: string): Promise<null | (() => Promise<void>)>;
