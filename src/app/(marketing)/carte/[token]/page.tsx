import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { RememberCard } from "@/components/loyalty/remember-card";
import { LoyaltyCardFeedback } from "@/components/loyalty/loyalty-card-feedback";
import { LoyaltyStampCard } from "@/components/loyalty/loyalty-stamp-card";
import { shortCardCode } from "@/lib/loyalty/card-code";
import { getPublicCardByToken } from "@/lib/loyalty/cards";
import { getLoyaltyCardReviewStaff } from "@/lib/loyalty/card-review";
import { scopedPage } from "@/lib/http/route-scope";

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

export default scopedPage(
  "public",
  async function LoyaltyCardPage({ params }: { params: { token: string } }) {
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
    const generatedName =
      anonymous &&
      card.firstName === "Cliente" &&
      (card.lastName === token.slice(-4) ||
        (card.phone?.startsWith("WL") && card.lastName === card.phone.slice(-4).toUpperCase()));

    return (
      <main className="min-h-screen bg-vt-surface py-[var(--vt-space-1p5rem)] sm:py-[var(--vt-space-2p5rem)]">
        <div className="mx-auto max-w-[var(--vt-size-28rem)] space-y-[var(--vt-space-1rem)] px-[var(--vt-space-1rem)]">
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
            <LoyaltyCardFeedback
              token={token}
              organizationName={card.organizationName}
              firstName={generatedName ? "" : card.firstName}
              lastName={generatedName ? "" : card.lastName}
              phone={card.phone}
              staffOptions={reviewStaff}
              collectProfile
            />
          ) : (
            <>
              <section className="rounded-2xl border border-[#F0DDE7] bg-white p-[var(--vt-space-1rem)] sm:p-[var(--vt-space-1p25rem)]">
                <h2 className="text-[length:var(--vt-text-1p125rem)]/[var(--vt-line-1p75rem)] font-extrabold text-vt-ink">Mes informations</h2>
                <dl className="mt-[var(--vt-space-0p75rem)] space-y-[var(--vt-space-0p75rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)]">
                  {[
                    { label: "Prénom", value: card.firstName },
                    { label: "Nom", value: card.lastName },
                    { label: "Téléphone", value: card.phone },
                  ]
                    .filter((item) => item.value?.trim())
                    .map((item) => (
                      <div
                        key={item.label}
                        className="flex flex-wrap items-baseline justify-between gap-[var(--vt-size-0p5rem)]"
                      >
                        <dt className="text-vt-muted-soft">{item.label}</dt>
                        <dd className="break-words font-semibold text-vt-ink">{item.value}</dd>
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
            <h2 className="px-[var(--vt-size-0p25rem)] text-[length:var(--vt-text-1p25rem)]/[var(--vt-line-1p75rem)] font-extrabold text-vt-ink">Historique des passages</h2>
            <ul className="mt-[var(--vt-space-0p75rem)] space-y-[var(--vt-space-0p75rem)]">
              {card.history.length === 0 ? (
                <li className="rounded-2xl border border-[#F0DDE7] bg-white p-[var(--vt-space-1rem)] text-center text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] text-vt-muted-soft">
                  Votre premier passage validé apparaîtra ici.
                </li>
              ) : (
                card.history.map((item) => (
                  <li
                    key={`${item.at}-${item.service}`}
                    className="flex items-center justify-between gap-[var(--vt-space-0p75rem)] rounded-2xl border border-[#F0DDE7] bg-white px-[var(--vt-space-1rem)] py-[var(--vt-space-0p75rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)]"
                  >
                    <div className="min-w-[var(--vt-size-0rem)]">
                      <p className="text-[length:var(--vt-text-0p75rem)]/[var(--vt-line-1rem)] text-vt-muted-soft">{day(item.at)}</p>
                      <p className="mt-[var(--vt-size-0p25rem)] truncate font-semibold text-vt-ink">{item.service}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-vt-surface-soft px-[var(--vt-space-0p75rem)] py-[var(--vt-size-0p25rem)] text-[length:var(--vt-text-0p75rem)]/[var(--vt-line-1rem)] font-bold text-[#A83E70]">
                      {item.points > 0 ? `+${item.points}` : item.points} passage
                    </span>
                  </li>
                ))
              )}
            </ul>
          </section>
          <p className="pb-[var(--vt-space-1rem)] text-center text-[length:var(--vt-text-0p75rem)]/[var(--vt-line-1rem)] text-[#8C7682]">
            Carte personnelle · Les passages et récompenses sont confirmés par l’institut.
          </p>
        </div>
      </main>
    );
  },
);
