export type StorageCategory = "logos" | "exports" | "documents";

export type PutObjectInput = {
  category: StorageCategory;
  organizationId: string;
  filename: string;
  data: Buffer;
  contentType: string;
};

export type StoredObject = {
  key: string;
  url: string;
  size: number;
  contentType: string;
};

export interface StorageService {
  put(input: PutObjectInput): Promise<StoredObject>;
  getPublicUrl(key: string): string | null;
  delete(key: string): Promise<void>;
}

export class StorageNotConfiguredError extends Error {
  code = "STORAGE_NOT_CONFIGURED" as const;
  constructor() {
    super("Stockage S3 non configuré — définir S3_BUCKET et clés");
  }
}
