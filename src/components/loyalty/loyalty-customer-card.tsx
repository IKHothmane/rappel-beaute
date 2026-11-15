import { Check, Crown, Gift } from "lucide-react";
import { LoyaltyCardQr } from "@/components/loyalty/loyalty-card-qr";
import { loyaltyCardBackgroundStyle } from "@/lib/loyalty/card-background";

/** Couleur de repli (bordeaux) tant que l'image de fond n'est pas chargée. */
function fallbackColor(color?: string | null) {
  return /^#[0-9A-Fa-f]{6}$/.test(color ?? "") ? (color as string) : "#4A1428";
}

type Props = {
  organizationName: string;
  programName?: string | null;
  backgroundUrl?: string | null;
  backgroundColor?: string | null;
  /** Passages du cycle en cours. */
  progress: number;
  threshold: number;
  remaining: number;
  rewardLabel: string;
  rewardsAvailable: number;
  qr: string;
  code?: string | null;
  holderName: string;
  holderSubtitle?: string;
};

function plural(count: number, one: string, many: string) {
  return count > 1 ? many : one;
}

/**
 * Carte de la cliente, pensée pour un téléphone : institut, progression vers la récompense,
 * puis QR à présenter à chaque visite. Même univers visuel que la carte de l'institut.
 */
export function LoyaltyCustomerCard({
  organizationName,
  programName,
  backgroundUrl,
  backgroundColor,
  progress,
  threshold,
  remaining,
  rewardLabel,
  rewardsAvailable,
  qr,
  code,
  holderName,
  holderSubtitle,
}: Props) {
  const rewardReady = rewardsAvailable > 0;
  const missing = Math.max(0, remaining);
  const stampSize = threshold <= 8 ? "h-8 w-8" : "h-7 w-7";
  const goal = rewardLabel.trim();

  return (
    <article
      aria-label={`Carte de fidélité ${organizationName}`}
      className="relative min-w-0 overflow-hidden rounded-3xl p-4 text-white shadow-md sm:p-6"
      style={{
        background: loyaltyCardBackgroundStyle(backgroundUrl),
        // Défini après le raccourci `background` : couleur de repli si l'image tarde ou échoue.
        backgroundColor: fallbackColor(backgroundColor),
      }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-[#E8C56B]/10" />

      <header className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Crown className="text-[#E8C56B]" size={22} aria-hidden="true" />
          <p className="mt-2 font-display text-[20px] uppercase leading-tight tracking-[0.08em] text-[#E8C56B] [overflow-wrap:anywhere] sm:text-[26px] sm:tracking-[0.14em]">
            {organizationName}
          </p>
          {programName && programName !== organizationName ? (
            <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/75 [overflow-wrap:anywhere]">{programName}</p>
          ) : null}
        </div>
        <p className="shrink-0 text-right text-[10px] font-bold uppercase leading-tight tracking-[0.14em] text-white/80">
          Carte
          <br />
          fidélité
        </p>
      </header>

      <section aria-label="Progression" className="relative mt-5 rounded-2xl bg-black/35 p-4">
        {rewardReady ? (
          <>
            <p className="inline-flex items-center gap-2 rounded-full bg-[#E8C56B] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.1em] text-[#3A2533]">
              <Gift size={14} aria-hidden="true" />
              Récompense disponible{rewardsAvailable > 1 ? ` × ${rewardsAvailable}` : ""}
            </p>
            <p className="mt-3 text-xl font-extrabold leading-snug [overflow-wrap:anywhere]">
              {goal || "Votre récompense vous attend"}
            </p>
            <p className="mt-1 text-sm text-white/85">
              Présentez le QR ci-dessous à l’institut pour en profiter.
            </p>
          </>
        ) : (
          <>
            <p className="text-xl font-extrabold leading-snug [overflow-wrap:anywhere]">
              Plus que <span className="text-[#E8C56B]">{missing} {plural(missing, "passage", "passages")}</span>{" "}
              pour {goal ? <span>{goal}</span> : "votre récompense"}
            </p>
            <p className="mt-1 text-sm text-white/85">
              {progress} / {threshold} passages validés
            </p>
          </>
        )}
        <div
          role="img"
          aria-label={`${progress} passage${progress > 1 ? "s" : ""} validé${progress > 1 ? "s" : ""} sur ${threshold}`}
          className="mt-3 flex flex-wrap gap-1.5"
        >
          {Array.from({ length: threshold }, (_, index) => {
            const filled = index < progress;
            const last = index === threshold - 1;
            return (
              <span
                key={index}
                aria-hidden="true"
                className={`flex ${stampSize} items-center justify-center rounded-full ${
                  filled
                    ? "bg-[#E8C56B] text-[#3A2533]"
                    : last
                      ? "border-2 border-dashed border-[#E8C56B] text-[#E8C56B]"
                      : "border-2 border-white/60"
                }`}
              >
                {filled ? <Check size={16} strokeWidth={3} /> : last ? <Gift size={15} /> : null}
              </span>
            );
          })}
        </div>
      </section>

      <section aria-label="Mon QR code" className="relative mt-4 rounded-2xl bg-white p-4 text-[#3A2533]">
        <p className="text-center text-base font-extrabold leading-snug">
          Présentez ce QR à l’institut à chaque visite
        </p>
        <p className="mb-3 mt-1 text-center text-sm text-[#6B5763]">
          L’institut le scanne pour valider votre passage.
        </p>
        <LoyaltyCardQr qr={qr} alt="QR code personnel de votre carte de fidélité" code={code} />
      </section>

      <footer className="relative mt-4 border-t border-white/20 pt-4">
        <p className="line-clamp-2 text-base font-semibold [overflow-wrap:anywhere] sm:text-lg">{holderName}</p>
        {holderSubtitle ? <p className="line-clamp-1 text-sm text-white/80">{holderSubtitle}</p> : null}
      </footer>
    </article>
  );
}
