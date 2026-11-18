import { NextResponse, type NextRequest } from "next/server";
import { previewJoinQr } from "@/lib/loyalty/join-qr";
import { applyLoyaltySession, resolveLoyaltyJoinSession } from "@/lib/loyalty/customer-session";
import { publicRoute } from "@/lib/http/route-scope";
import { enrollmentPage, INVALID_QR_PAGE, PROGRAM_DISABLED_PAGE, TECHNICAL_ERROR_PAGE } from "./join-pages";

function page(body: string, status: number) {
  return new NextResponse(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export const GET = publicRoute(async function GET(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  const token = params.token.trim().toUpperCase();
  try {
    const institute = await previewJoinQr(token);
    if (!institute) return page(INVALID_QR_PAGE, 404);

    const session = await resolveLoyaltyJoinSession(request, institute.organizationId);
    if (session) {
      const response = new NextResponse(null, {
        status: 307,
        headers: {
          Location: `/carte/${encodeURIComponent(session.cardToken)}/`,
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      });
      applyLoyaltySession(response, institute.organizationId, session);
      return response;
    }
    if (!institute.active) return page(PROGRAM_DISABLED_PAGE, 400);
    return page(enrollmentPage({ token, organizationName: institute.organizationName }), 200);
  } catch (error) {
    console.error("[GET /carte/rejoindre]", error);
    return page(TECHNICAL_ERROR_PAGE, 500);
  }
});
