import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { RememberCard } from "@/components/loyalty/remember-card";
import { LoyaltyCardFeedback } from "@/components/loyalty/loyalty-card-feedback";
import { LoyaltyStampCard } from "@/components/loyalty/loyalty-stamp-card";
import { shortCardCode } from "@/lib/loyalty/card-code";
import { getPublicCardByToken } from "@/lib/loyalty/cards";
import { getLoyaltyCardReviewStaff } from "@/lib/loyalty/card-review";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ma carte de fidélité",
  robots: { index: false, follow: false },
};

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

  const anonymous = !card.phone || card.phone.startsWith("WL");
  const reviewStaff = await getLoyaltyCardReviewStaff(token);
  const generatedName = anonymous && card.firstName === "Cliente" &&
    (card.lastName === token.slice(-4) || (card.phone?.startsWith("WL") && card.lastName === card.phone.slice(-4).toUpperCase()));

  return (
    <main className="min-h-screen bg-[#F8F3F5] py-6 sm:py-10">
      <div className="mx-auto max-w-md space-y-4 px-4">
        <RememberCard token={token} />
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
          phone={card.phone}
          code={shortCardCode(token)}
          appointments={card.appointments}
          sessions={card.sessions}
        />

        {anonymous ? (
          <LoyaltyCardFeedback token={token} organizationName={card.organizationName}
            firstName={generatedName ? "" : card.firstName} lastName={generatedName ? "" : card.lastName}
            phone={card.phone} staffOptions={reviewStaff} collectProfile />
        ) : (
          <>
          <section className="rounded-2xl border border-[#F0DDE7] bg-white p-4 sm:p-5">
            <h2 className="text-lg font-extrabold text-[#43293A]">Mes informations</h2>
            <dl className="mt-3 space-y-3 text-sm">
              {[
                { label: "Prénom", value: card.firstName },
                { label: "Nom", value: card.lastName },
                { label: "Téléphone", value: card.phone },
              ].filter((item) => item.value?.trim()).map((item) => (
                <div key={item.label} className="flex flex-wrap items-baseline justify-between gap-2">
                  <dt className="text-[#806B77]">{item.label}</dt>
                  <dd className="break-words font-semibold text-[#43293A]">{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <LoyaltyCardFeedback
            token={token}
            organizationName={card.organizationName}
            firstName={card.firstName}
            lastName={card.lastName}
            phone={card.phone}
            staffOptions={reviewStaff}
          />
          </>
        )}

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
