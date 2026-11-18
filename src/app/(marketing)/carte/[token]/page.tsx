import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { RememberCard } from "@/components/loyalty/remember-card";
import { LoyaltyCardView } from "@/components/loyalty/loyalty-card-view";
import { shortCardCode } from "@/lib/loyalty/card-code";
import { getPublicCardByToken } from "@/lib/loyalty/cards";
import { getLoyaltyCardSession } from "@/lib/loyalty/customer-session";
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
    const token = params.token.trim().toUpperCase();
    if (!/^RBLOY_[A-Z2-9]{8,32}$/.test(token)) notFound();
    const session = await getLoyaltyCardSession({ cookies: cookies() }, token);
    if (!session) {
      return (
        <main className="mx-auto max-w-md px-5 py-12 text-vt-ink">
          <h1 className="text-2xl font-bold">Retrouver ma carte de fidélité</h1>
          <p className="mt-4">Scannez le QR d’adhésion de votre institut, puis choisissez « Retrouver ma carte ». L’équipe vérifiera votre identité pour rétablir votre accès.</p>
        </main>
      );
    }
    const card = await getPublicCardByToken(token, session.customerId);
    if (!card) notFound();
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
        <RememberCard />
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
