import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getLocalUploadsRoot } from "@/lib/storage/local-root";
import { isPathInsideRoot } from "@/lib/storage/path-guard";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

/** logos|loyalty|services|resources / org / fichier (horodaté ou stable) */
const KEY_RE =
  /^(logos|loyalty|services|resources)\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/;

type RouteContext = { params: Promise<{ key: string[] }> };

export async function GET(_request: Request, context: RouteContext) {
  const { key: parts } = await context.params;
  const key = (parts ?? [])
    .map((p) => decodeURIComponent(p))
    .filter(Boolean)
    .join("/");
  if (!KEY_RE.test(key)) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  const root = path.resolve(getLocalUploadsRoot());
  const resolved = path.resolve(root, key);
  if (!isPathInsideRoot(root, resolved)) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  try {
    const data = await readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        // Pas d’immutable : les clés stables sont écrasées au re-upload.
        "Cache-Control": "public, max-age=86400, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }
}
