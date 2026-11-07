import path from "path";

/** Vérifie qu’un chemin résolu reste sous la racine (Windows : casse ignoree). */
export function isPathInsideRoot(root: string, resolved: string): boolean {
  const rootNorm = path.resolve(root);
  const resolvedNorm = path.resolve(resolved);
  if (process.platform === "win32") {
    const a = rootNorm.toLowerCase();
    const b = resolvedNorm.toLowerCase();
    if (b === a) return true;
    const prefix = a.endsWith(path.sep) ? a : a + path.sep;
    return b.startsWith(prefix);
  }
  if (resolvedNorm === rootNorm) return true;
  const prefix = rootNorm.endsWith(path.sep) ? rootNorm : rootNorm + path.sep;
  return resolvedNorm.startsWith(prefix);
}
