import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getPublicCardByToken } from "@/lib/loyalty/cards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Carte fidélité",
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
  const qr = await QRCode.toDataURL(params.token.trim().toUpperCase(), {
    margin: 1,
    width: 280,
    errorCorrectionLevel: "M",
  });
  const pct = Math.min(100, Math.round((card.cycle / card.visitsPerReward) * 100));

  return (
    <section className="bg-paper min-h-screen py-10 sm:py-16">
      <div className="mx-auto max-w-md px-4">
        {/* Card Header & Body */}
        <article className="rounded-3xl border border-line bg-white p-6 text-center shadow-md">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            {card.organizationName}
          </p>
          <h1 className="mt-2 font-display text-3xl font-light text-ink">Carte fidélité</h1>
          <p className="mt-1 text-sm text-ink/60">{card.firstName}</p>

          <div className="my-6 rounded-2xl bg-[#FFEFF8] p-5">
            <p className="font-display text-4xl text-ink">
              {card.cycle} / {card.visitsPerReward} <span className="text-xl font-normal text-ink/70">passages</span>
            </p>
            {/* Visual Progress Bar */}
            <div className="mx-auto mt-4 h-3 w-full overflow-hidden rounded-full bg-[#F0DDE9]">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Discrete Dots / Blocks */}
            <div className="mt-3 flex justify-center gap-1.5 text-lg font-mono">
              {Array.from({ length: card.visitsPerReward }).map((_, i) => (
                <span key={i} className={i < card.cycle ? "text-primary font-bold" : "text-ink/20"}>
                  {i < card.cycle ? "█" : "░"}
                </span>
              ))}
            </div>

            <p className="mt-3 text-sm font-medium text-ink/80">
              {card.rewardsAvailable > 0
                ? `${card.rewardLabel} disponible`
                : card.remaining > 0
                  ? `Encore ${card.remaining} passage${card.remaining > 1 ? "s" : ""} pour ${card.rewardLabel}`
                  : "Récompense utilisée"}
            </p>
          </div>

          {/* QR Code */}
          <div className="inline-block rounded-2xl border border-line bg-white p-3 shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR Code Fidélité" width={220} height={220} className="h-52 w-52" />
          </div>

          {card.rewardsAvailable > 0 ? (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#FFDEA4] px-4 py-1.5 text-xs font-bold text-[#261900]">
              🎁 {card.rewardsAvailable} récompense{card.rewardsAvailable > 1 ? "s" : ""} disponible{card.rewardsAvailable > 1 ? "s" : ""}
            </div>
          ) : null}
        </article>

        {/* Historique */}
        <div className="mt-8">
          <h2 className="font-display text-2xl font-light text-ink">Historique</h2>
          <ul className="mt-4 space-y-3">
            {card.history.length === 0 ? (
              <li className="rounded-2xl border border-line bg-white p-4 text-center text-sm text-ink/60">
                Aucun passage validé pour le moment.
              </li>
            ) : (
              card.history.map((item, idx) => (
                <li key={idx} className="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3 text-sm shadow-xs">
                  <div>
                    <p className="text-xs text-ink/50">{day(item.at)}</p>
                    <p className="font-semibold text-ink">{item.service}</p>
                    <p className="text-xs text-ink/70">{money(item.amount)}</p>
                  </div>
                  <span className="rounded-full bg-[#FCE9F4] px-3 py-1 text-xs font-bold text-primary">
                    +1 passage
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Récompenses */}
        <div className="mt-8">
          <h2 className="font-display text-2xl font-light text-ink">🎁 Récompenses</h2>
          <ul className="mt-4 space-y-3">
            {card.rewards.length === 0 ? (
              <li className="rounded-2xl border border-line bg-white p-4 text-center text-sm text-ink/60">
                Pas encore de récompense obtenue.
              </li>
            ) : (
              card.rewards.map((item) => (
                <li key={item.id} className="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3 text-sm shadow-xs">
                  <div>
                    <p className="font-semibold text-ink">🎁 {item.name}</p>
                    <p className="text-xs text-ink/60">
                      Obtenue après {card.visitsPerReward} passages · {day(item.earnedAt)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      item.status === "AVAILABLE"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {item.status === "AVAILABLE" ? "Disponible" : "Utilisée"}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
