import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ROOT = process.env.STORAGE_LOCAL_DIR ?? path.join(process.cwd(), "uploads");

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

const KEY_RE = /^logos\/[a-zA-Z0-9_-]+\/[0-9]+_[a-zA-Z0-9._-]+$/;

type RouteContext = { params: Promise<{ key: string[] }> };

export async function GET(_request: Request, context: RouteContext) {
  const { key: parts } = await context.params;
  const key = (parts ?? []).map((p) => decodeURIComponent(p)).join("/");
  if (!KEY_RE.test(key)) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  const full = path.join(ROOT, key);
  const resolved = path.resolve(full);
  if (!resolved.startsWith(path.resolve(ROOT))) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  try {
    const data = await readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }
}
