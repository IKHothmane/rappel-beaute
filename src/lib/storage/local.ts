import fs from "fs/promises";
import path from "path";
import type { PutObjectInput, StorageService, StoredObject } from "./types";

const ROOT = process.env.STORAGE_LOCAL_DIR ?? path.join(process.cwd(), "uploads");

function buildKey(input: PutObjectInput): string {
  const safe = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${input.category}/${input.organizationId}/${Date.now()}_${safe}`;
}

export class LocalStorageService implements StorageService {
  async put(input: PutObjectInput): Promise<StoredObject> {
    const key = buildKey(input);
    const full = path.join(ROOT, key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, input.data);
    return {
      key,
      url: `/api/storage/local/${encodeURIComponent(key)}`,
      size: input.data.length,
      contentType: input.contentType,
    };
  }

  getPublicUrl(key: string): string | null {
    return `/api/storage/local/${encodeURIComponent(key)}`;
  }

  async delete(key: string): Promise<void> {
    const full = path.join(ROOT, key);
    await fs.unlink(full).catch(() => undefined);
  }
}
