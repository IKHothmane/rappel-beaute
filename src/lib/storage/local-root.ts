import path from "path";

/** Racine absolue des fichiers locaux — partagée écriture / lecture. */
export function getLocalUploadsRoot(): string {
  if (process.env.STORAGE_LOCAL_DIR?.trim()) {
    return path.resolve(process.env.STORAGE_LOCAL_DIR.trim());
  }
  return path.resolve(process.cwd(), "uploads");
}
