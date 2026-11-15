import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { RememberCard } from "@/components/loyalty/remember-card";
import { LoyaltyCardView } from "@/components/loyalty/loyalty-card-view";
import { shortCardCode } from "@/lib/loyalty/card-code";
import { getPublicCardByToken } from "@/lib/loyalty/cards";
import { getLoyaltyCardReviewStaff } from "@/lib/loyalty/card-review";
import { appleWalletConfigured, googleWalletConfigured } from "@/lib/loyalty/wallet-config";
import { scopedPage } from "@/lib/http/route-scope";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ma carte de fidélité",
  robots: { index: false, follow: false },
};

export default scopedPage(
  "public",
  async function LoyaltyCardPage({ params }: { params: { token: string } }) {
    const card = await getPublicCardByToken(params.token);
    if (!card) notFound();

    const token = params.token.trim().toUpperCase();
    // QR personnel : jeton seul (RBLOY_…) pour le scan institut — jamais d'URL localhost.
    // Le parcours Wallet reste sur /carte/[token]/google/ via le bouton d'installation.
    // Généré en 512 px (affiché ~240 px, agrandi ~350 px) pour rester net en plein soleil.
    const qr = await QRCode.toDataURL(token, {
      margin: 1,
      width: 512,
      errorCorrectionLevel: "M",
    });

    const anonymous = !card.phone || card.phone.startsWith("WL");
    const reviewStaff = await getLoyaltyCardReviewStaff(token);
    const generatedName =
      anonymous &&
      card.firstName === "Cliente" &&
      (card.lastName === token.slice(-4) ||
        (card.phone?.startsWith("WL") && card.lastName === card.phone.slice(-4).toUpperCase()));

    return (
      <>
        <RememberCard token={token} />
        <LoyaltyCardView
          card={card}
          token={token}
          qr={qr}
          code={shortCardCode(token)}
          anonymous={anonymous}
          generatedName={Boolean(generatedName)}
          reviewStaff={reviewStaff}
          walletEnabled={appleWalletConfigured() || googleWalletConfigured()}
        />
      </>
    );
  },
);
