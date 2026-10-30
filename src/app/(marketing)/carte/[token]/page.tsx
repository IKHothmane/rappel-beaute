import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { LoyaltyCardFeedback } from "@/components/loyalty/loyalty-card-feedback";
import { LoyaltyStampCard } from "@/components/loyalty/loyalty-stamp-card";
import { getPublicCardByToken } from "@/lib/loyalty/cards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ma carte de fidélité",
  robots: { index: false, follow: false },
};

function money(amount: number) {
  return `${amount.toLocaleString("fr-FR")} DH`;
}

function day(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function LoyaltyCardPage({ params }: { params: { token: string } }) {
  const card = await getPublicCardByToken(params.token);
  if (!card) notFound();

  const token = params.token.trim().toUpperCase();
  // QR personnel : jeton seul (RBLOY_…) pour le scan institut — jamais d'URL localhost.
  // Le parcours Wallet reste sur /carte/[token]/google/ via le bouton d'installation.
  const qr = await QRCode.toDataURL(token, {
    margin: 1,
    width: 280,
    errorCorrectionLevel: "M",
  });

  return (
    <main className="min-h-screen bg-[#F8F3F5] py-6 sm:py-10">
      <div className="mx-auto max-w-md space-y-4 px-4">
        <LoyaltyStampCard
          organizationName={card.organizationName}
          firstName={card.firstName}
          lastName={card.lastName}
          visits={card.visits}
          cycle={card.cycle}
          visitsPerReward={card.visitsPerReward}
          remaining={card.remaining}
          rewardLabel={card.rewardLabel}
          rewardsAvailable={card.rewardsAvailable}
          rewards={card.rewards}
          qr={qr}
          backgroundUrl={card.cardBackgroundUrl}
          appointments={card.appointments}
          sessions={card.sessions}
        />

        <LoyaltyCardFeedback
          token={token}
          organizationName={card.organizationName}
          firstName={card.firstName}
          lastName={card.lastName}
          phone={card.phone}
        />

        <section>
          <h2 className="px-1 text-xl font-extrabold text-[#43293A]">Historique des passages</h2>
          <ul className="mt-3 space-y-3">
            {card.history.length === 0 ? (
              <li className="rounded-2xl border border-[#F0DDE7] bg-white p-4 text-center text-sm text-[#806B77]">
                Votre premier passage validé apparaîtra ici.
              </li>
            ) : (
              card.history.map((item) => (
                <li key={`${item.at}-${item.service}`} className="flex items-center justify-between gap-3 rounded-2xl border border-[#F0DDE7] bg-white px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-xs text-[#806B77]">{day(item.at)}</p>
                    <p className="mt-1 truncate font-semibold text-[#43293A]">{item.service}</p>
                    <p className="text-xs text-[#806B77]">{money(item.amount)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#FCE9F4] px-3 py-1 text-xs font-bold text-[#A83E70]">
                    {item.points > 0 ? `+${item.points}` : item.points} passage
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
        <p className="pb-4 text-center text-xs text-[#8C7682]">Carte personnelle · Les passages et récompenses sont confirmés par l’institut.</p>
      </div>
    </main>
  );
}
