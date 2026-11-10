import { NextResponse } from "next/server";
import { publicRoute } from "@/lib/http/route-scope";

/** Apple envoie des journaux. On les ignore pour ne jamais stocker un jeton. */
export const POST = publicRoute(async function POST() {
  return new NextResponse(null, { status: 200 });
});
