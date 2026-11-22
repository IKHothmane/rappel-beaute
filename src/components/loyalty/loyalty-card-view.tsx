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
  // Une carte ancienne, créée sans profil, porte un nom et un numéro provisoires : on ne les affiche pas.
  const infoRows = [
    { label: "Prénom", value: generatedName ? "" : card.firstName },
    { label: "Nom", value: generatedName ? "" : card.lastName },
    { label: "Téléphone", value: anonymous ? "" : card.phone },
  ].filter((item) => item.value?.trim());

  return (
    <div className="min-h-screen bg-vt-surface py-[var(--vt-space-1p5rem)] sm:py-[var(--vt-space-2p5rem)]">
      <div className="mx-auto max-w-[var(--vt-size-28rem)] space-y-[var(--vt-space-1rem)] px-[var(--vt-space-1rem)]">
        <h1 className="sr-only">Ma carte de fidélité {card.organizationName}</h1>

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

        {card.history.length > 0 ? (
          <section aria-labelledby="loyalty-history-title">
            <h2 id="loyalty-history-title" className={`px-[var(--vt-size-0p25rem)] ${H2}`}>Historique des passages</h2>
            <ul className="mt-[var(--vt-space-0p75rem)] space-y-[var(--vt-space-0p75rem)]">
              {card.history.map((item) => (
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
              ))}
            </ul>
          </section>
        ) : null}

        {/* Le profil est rempli avant la création de la carte : plus d'invitation « Compléter mon profil ». */}
        {infoRows.length > 0 ? (
          <section aria-labelledby="loyalty-info-title" className={`${CARD} p-[var(--vt-space-1rem)] sm:p-[var(--vt-space-1p25rem)]`}>
            <h2 id="loyalty-info-title" className={H2}>Mes informations</h2>
            <dl className="mt-[var(--vt-space-0p75rem)] space-y-[var(--vt-space-0p75rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)]">
              {infoRows.map((item) => (
                <div key={item.label} className="flex flex-wrap items-baseline justify-between gap-[var(--vt-size-0p5rem)]">
                  <dt className="text-vt-muted">{item.label}</dt>
                  <dd className="break-words font-semibold text-vt-ink">{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
        <LoyaltyCardFeedback
          token={token}
          organizationName={card.organizationName}
          firstName={generatedName ? "" : card.firstName}
          lastName={generatedName ? "" : card.lastName}
          phone={card.phone}
          staffOptions={reviewStaff}
        />

        <p className="pb-[var(--vt-space-1rem)] text-center text-[length:var(--vt-text-0p75rem)]/[var(--vt-line-1rem)] text-vt-muted">
          Carte personnelle · Les passages et récompenses sont confirmés par l’institut.
        </p>
      </div>
    </div>
  );
}
