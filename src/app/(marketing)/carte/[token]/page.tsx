import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ClientPassCard } from "@/components/loyalty/client-pass-card";
import { WalletInstall } from "@/components/loyalty/wallet-install";
import { getPublicCardByToken } from "@/lib/loyalty/cards";
import { SITE } from "@/lib/site";

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

function cardOrigin() {
  return SITE.url.replace(/\/$/, "");
}

export default async function LoyaltyCardPage({ params }: { params: { token: string } }) {
  const card = await getPublicCardByToken(params.token);
  if (!card) notFound();
  const token = params.token.trim().toUpperCase();
  const cardUrl = `${cardOrigin()}/carte/${token}/`;
  const qr = await QRCode.toDataURL(cardUrl, {
    margin: 1,
    width: 280,
    errorCorrectionLevel: "M",
  });
  const pct = Math.min(100, Math.round((card.cycle / card.visitsPerReward) * 100));

  return (
    <section className="min-h-screen bg-paper py-10 sm:py-16">
      <div className="mx-auto max-w-md px-4">
        <ClientPassCard
          organizationName={card.organizationName}
          firstName={card.firstName}
          appointments={card.appointments}
          sessions={card.sessions}
          qr={qr}
        />

        <article className="mt-6 rounded-3xl border border-line bg-white p-6 text-center shadow-md">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Bienvenue chez {card.organizationName}
          </p>
          <h1 className="mt-2 font-display text-3xl font-light text-ink">Votre carte fidélité est prête</h1>
          <p className="mt-2 text-sm text-ink/60">
            {card.firstName} {card.lastName}
          </p>
          <div className="my-6 rounded-2xl bg-[#FFEFF8] p-5">
            <p className="font-display text-4xl text-ink">
              {card.cycle} / {card.visitsPerReward}{" "}
              <span className="text-xl font-normal text-ink/70">passages</span>
            </p>
            <div className="mx-auto mt-4 h-3 w-full overflow-hidden rounded-full bg-[#F0DDE9]">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-3 text-sm font-medium text-ink/80">
              {card.rewardsAvailable > 0
                ? "Récompense disponible"
                : card.remaining > 0
                  ? `Encore ${card.remaining} passage${card.remaining > 1 ? "s" : ""} pour ${card.rewardLabel}`
                  : "Récompense utilisée"}
            </p>
          </div>
          {card.rewards
            .filter((reward) => reward.status === "AVAILABLE")
            .map((reward) => {
              const left = reward.expiresAt
                ? Math.max(0, Math.ceil((new Date(reward.expiresAt).getTime() - Date.now()) / 86_400_000))
                : null;
              return (
                <div key={reward.id} className="mt-4 rounded-2xl border border-primary/20 bg-[#FFEFF8] p-4 text-left">
                  <p className="text-sm font-semibold text-ink">Récompense disponible</p>
                  <p className="mt-1 font-display text-2xl text-ink">{reward.name}</p>
                  {reward.value != null ? (
                    <p className="mt-1 text-sm text-ink/80">Valeur : {money(reward.value)}</p>
                  ) : null}
                  {left != null ? (
                    <p className="text-sm text-ink/70">
                      Expire dans {left} jour{left > 1 ? "s" : ""}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-ink/60">L&apos;institut confirme l&apos;utilisation en salon.</p>
                </div>
              );
            })}
          <WalletInstall token={token} />
        </article>

        <div className="mt-8">
          <h2 className="font-display text-2xl font-light text-ink">Historique</h2>
          <ul className="mt-4 space-y-3">
            {card.history.length === 0 ? (
              <li className="rounded-2xl border border-line bg-white p-4 text-center text-sm text-ink/60">
                Aucun passage validé pour le moment.
              </li>
            ) : (
              card.history.map((item) => (
                <li
                  key={`${item.at}-${item.service}`}
                  className="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3 text-sm"
                >
                  <div>
                    <p className="text-xs text-ink/50">{day(item.at)}</p>
                    <p className="font-semibold text-ink">{item.service}</p>
                    <p className="text-xs text-ink/70">{money(item.amount)}</p>
                  </div>
                  <span className="rounded-full bg-[#FCE9F4] px-3 py-1 text-xs font-bold text-primary">
                    {item.points > 0 ? `+${item.points}` : item.points} passage
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
