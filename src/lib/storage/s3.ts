import type { PutObjectInput, StorageService, StoredObject } from "./types";

/**
 * Stockage S3-compatible (AWS S3, Cloudflare R2, MinIO).
 * V1 : préparation — implémentation complète lors du branchement infra.
 * Les fichiers ne doivent jamais être stockés dans PostgreSQL.
 * ❌ Photos clientes — hors périmètre V1.
 */
export class S3StorageService implements StorageService {
  private bucket: string;
  private endpoint: string;
  private publicBase: string;

  constructor() {
    const bucket = process.env.S3_BUCKET;
    const endpoint = process.env.S3_ENDPOINT;
    if (!bucket || !endpoint) throw new Error("S3_BUCKET et S3_ENDPOINT requis");
    this.bucket = bucket;
    this.endpoint = endpoint.replace(/\/$/, "");
    this.publicBase = (process.env.S3_PUBLIC_URL ?? `${this.endpoint}/${bucket}`).replace(/\/$/, "");
  }

  async put(input: PutObjectInput): Promise<StoredObject> {
    const safe = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${input.category}/${input.organizationId}/${Date.now()}_${safe}`;
    const url = `${this.endpoint}/${this.bucket}/${key}`;

    const accessKey = process.env.S3_ACCESS_KEY;
    const secretKey = process.env.S3_SECRET_KEY;
    if (!accessKey || !secretKey) {
      throw new Error("S3_ACCESS_KEY et S3_SECRET_KEY requis pour upload");
    }

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": input.contentType,
        "Content-Length": String(input.data.length),
        Authorization: `Bearer ${accessKey}:${secretKey}`,
      },
      // Buffer → Uint8Array : fetch BodyInit n'accepte pas Buffer sous typings DOM/Node 22
      body: new Uint8Array(input.data),
    });

    if (!res.ok) {
      throw new Error(`S3 upload failed: ${res.status} — configurez le SDK AWS/R2 côté infra`);
    }

    return {
      key,
      url: `${this.publicBase}/${key}`,
      size: input.data.length,
      contentType: input.contentType,
    };
  }

  getPublicUrl(key: string): string | null {
    return `${this.publicBase}/${key}`;
  }

  async delete(key: string): Promise<void> {
    const url = `${this.endpoint}/${this.bucket}/${key}`;
    await fetch(url, { method: "DELETE" }).catch(() => undefined);
  }
}
