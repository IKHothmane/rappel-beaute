import { NextResponse } from "next/server";

/** Apple envoie des journaux. On les ignore pour ne jamais stocker un jeton. */
export async function POST() {
  return new NextResponse(null, { status: 200 });
}
