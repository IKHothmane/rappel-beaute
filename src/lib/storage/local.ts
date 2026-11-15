import fs from "fs/promises";
import path from "path";
import { getLocalUploadsRoot } from "./local-root";
import { extensionForMime } from "./image-upload";
import { isPathInsideRoot } from "./path-guard";
import type { PutObjectInput, StorageService, StoredObject } from "./types";

/**
 * Pour un type image connu, l'extension vient du MIME (liste blanche) et non du
 * nom client : le type servi par /api/storage/local dépend de l'extension.
 */
export function safeStorageFilename(filename: string, contentType: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = extensionForMime(contentType.toLowerCase());
  if (!ext) return safe;
  const dot = safe.lastIndexOf(".");
  const base = (dot > 0 ? safe.slice(0, dot) : safe).replace(/^\.+/, "") || "file";
  return `${base}.${ext}`;
}

function buildKey(input: PutObjectInput): string {
  const safe = safeStorageFilename(input.filename, input.contentType);
  if (input.fixedKey) {
    const fixed = input.fixedKey.replace(/[^a-zA-Z0-9._/-]/g, "_").replace(/\.\./g, "");
    return `${input.category}/${input.organizationId}/${fixed}`;
  }
  const stamp = input.stamp ?? Date.now();
  return `${input.category}/${input.organizationId}/${stamp}_${safe}`;
}

function publicUrl(key: string, cacheBust?: number): string {
  const base = `/api/storage/local/${key.split("/").map(encodeURIComponent).join("/")}`;
  return cacheBust ? `${base}?v=${cacheBust}` : base;
}

export class LocalStorageService implements StorageService {
  async put(input: PutObjectInput): Promise<StoredObject> {
    const key = buildKey(input);
    const root = path.resolve(getLocalUploadsRoot());
    const resolved = path.resolve(root, key);
    if (!isPathInsideRoot(root, resolved)) {
      throw new Error("Chemin de stockage invalide.");
    }

    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.writeFile(resolved, input.data);

    const stat = await fs.stat(resolved);
    if (!stat.isFile() || stat.size !== input.data.length) {
      throw new Error("Échec d’écriture du fichier image.");
    }

    return {
      key,
      url: publicUrl(key, input.fixedKey ? Date.now() : undefined),
      size: input.data.length,
      contentType: input.contentType,
    };
  }

  getPublicUrl(key: string): string | null {
    return publicUrl(key);
  }

  async delete(key: string): Promise<void> {
    const full = path.join(getLocalUploadsRoot(), key);
    await fs.unlink(full).catch(() => undefined);
  }
}
