import type { NextRequest } from "next/server";

/** Parses a JSON object body. Returns null for invalid JSON or a non-object payload (caller answers 400). */
export async function readJsonObject(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
