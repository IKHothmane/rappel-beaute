import { Sparkles } from "lucide-react";
import { LoyaltyCardFeedback } from "@/components/loyalty/loyalty-card-feedback";
import { LoyaltyStampCard } from "@/components/loyalty/loyalty-stamp-card";
import { LoyaltyWalletCta } from "@/components/loyalty/loyalty-wallet-cta";
import type { CardProgress } from "@/lib/loyalty/cards";

type Props = {
  card: CardProgress;
  token: string;
  qr: string;
  code: string;
  anonymous: boolean;
  generatedName: boolean;
  reviewStaff: { id: string; name: string }[];
  walletEnabled: boolean;
};

function day(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const CARD = "rounded-2xl border border-[#F0DDE7] bg-white";
const H2 = "!font-extrabold !tracking-normal text-[length:var(--vt-text-1p125rem)]/[var(--vt-line-1p75rem)] text-vt-ink";

/** Page publique de la carte de fidélité (hors récupération des données) : un écran de téléphone, de haut en bas. */
export function LoyaltyCardView({ card, token, qr, code, anonymous, generatedName, reviewStaff, walletEnabled }: Props) {
  const firstVisit = card.visits === 0 && card.history.length === 0;

  return (
    <div className="min-h-screen bg-vt-surface py-[var(--vt-space-1p5rem)] sm:py-[var(--vt-space-2p5rem)]">
      <div className="mx-auto max-w-[var(--vt-size-28rem)] space-y-[var(--vt-space-1rem)] px-[var(--vt-space-1rem)]">
        <h1 className="sr-only">Ma carte de fidélité {card.organizationName}</h1>

        {firstVisit ? (
          <section aria-label="Bienvenue" className="flex items-start gap-3 rounded-2xl border border-[#E8C56B] bg-[#FFFBEF] p-4">
            <Sparkles size={22} aria-hidden="true" className="mt-0.5 shrink-0 text-[#A67A00]" />
            <div className="min-w-0">
              <p className="text-base font-extrabold text-[#43293A]">Bienvenue ! Votre carte est créée</p>
              <p className="mt-1 text-sm text-[#6B5763]">
                Présentez le QR ci-dessous à l’institut lors de votre prochaine visite pour recevoir votre premier passage.
              </p>
            </div>
          </section>
        ) : null}

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
          backgroundColor={card.cardBackgroundColor}
          phone={card.phone}
          code={code}
          appointments={card.appointments}
          sessions={card.sessions}
        />

        {walletEnabled ? <LoyaltyWalletCta token={token} /> : null}

        <section aria-labelledby="loyalty-history-title">
          <h2 id="loyalty-history-title" className={`px-[var(--vt-size-0p25rem)] ${H2}`}>Historique des passages</h2>
          <ul className="mt-[var(--vt-space-0p75rem)] space-y-[var(--vt-space-0p75rem)]">
            {card.history.length === 0 ? (
              <li className={`${CARD} p-[var(--vt-space-1rem)] text-center text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] text-vt-muted`}>
                Votre premier passage validé apparaîtra ici.
              </li>
            ) : (
              card.history.map((item) => (
                <li
                  key={`${item.at}-${item.service}`}
                  className={`${CARD} flex items-center justify-between gap-[var(--vt-space-0p75rem)] px-[var(--vt-space-1rem)] py-[var(--vt-space-0p75rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)]`}
                >
                  <div className="min-w-[var(--vt-size-0rem)]">
                    <p className="text-[length:var(--vt-text-0p75rem)]/[var(--vt-line-1rem)] text-vt-muted">{day(item.at)}</p>
                    <p className="mt-[var(--vt-size-0p25rem)] truncate font-semibold text-vt-ink">{item.service}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-vt-surface-soft px-[var(--vt-space-0p75rem)] py-[var(--vt-size-0p25rem)] text-[length:var(--vt-text-0p75rem)]/[var(--vt-line-1rem)] font-bold text-[#8F3360]">
                    {item.points > 0 ? `+${item.points}` : item.points} passage{Math.abs(item.points) > 1 ? "s" : ""}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

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
            <section aria-labelledby="loyalty-info-title" className={`${CARD} p-[var(--vt-space-1rem)] sm:p-[var(--vt-space-1p25rem)]`}>
              <h2 id="loyalty-info-title" className={H2}>Mes informations</h2>
              <dl className="mt-[var(--vt-space-0p75rem)] space-y-[var(--vt-space-0p75rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)]">
                {[
                  { label: "Prénom", value: card.firstName },
                  { label: "Nom", value: card.lastName },
                  { label: "Téléphone", value: card.phone },
                ]
                  .filter((item) => item.value?.trim())
                  .map((item) => (
                    <div key={item.label} className="flex flex-wrap items-baseline justify-between gap-[var(--vt-size-0p5rem)]">
                      <dt className="text-vt-muted">{item.label}</dt>
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

        <p className="pb-[var(--vt-space-1rem)] text-center text-[length:var(--vt-text-0p75rem)]/[var(--vt-line-1rem)] text-vt-muted">
          Carte personnelle · Les passages et récompenses sont confirmés par l’institut.
        </p>
      </div>
    </div>
  );
}
