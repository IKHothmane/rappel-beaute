/** Une seule visite guidée (driver.js) à la fois : parcours de première connexion ou visite manuelle de l'agenda. */
let owner: string | null = null;

export function acquireTourLock(id: string): boolean {
  if (owner && owner !== id) return false;
  owner = id;
  return true;
}

export function releaseTourLock(id: string): void {
  if (owner === id) owner = null;
}

export function tourLockedBy(): string | null {
  return owner;
}
