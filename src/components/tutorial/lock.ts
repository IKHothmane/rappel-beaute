/** Une seule visite guidée (driver.js) à la fois : parcours de première connexion, visite de l'agenda ou de l'équipe. */
let owner: string | null = null;

export function acquireTourLock(id: string): boolean {
  if (owner && owner !== id) return false;
  owner = id;
  return true;
}

export function releaseTourLock(id: string): void {
  if (owner === id) owner = null;
}

/** Vrai si `id` pourrait prendre le verrou maintenant (libre, ou déjà à lui). Ne prend rien. */
export function isTourLockAvailable(id: string): boolean {
  return !owner || owner === id;
}
