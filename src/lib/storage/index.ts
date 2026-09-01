import { LocalStorageService } from "./local";
import { S3StorageService } from "./s3";
import type { StorageService } from "./types";

let instance: StorageService | null = null;

/**
 * Logos instituts, exports, documents métier.
 * Dev/local → filesystem. Staging/prod → S3 (R2 recommandé avec Cloudflare).
 */
export function getStorageService(): StorageService {
  if (instance) return instance;

  if (process.env.S3_BUCKET && process.env.S3_ENDPOINT) {
    instance = new S3StorageService();
  } else if (process.env.NODE_ENV !== "production") {
    instance = new LocalStorageService();
  } else {
    instance = new LocalStorageService();
    console.warn("[storage] S3 non configuré en production — fallback local (configurer avant go-live)");
  }

  return instance;
}

export type { PutObjectInput, StoredObject, StorageCategory } from "./types";
export { StorageNotConfiguredError } from "./types";
