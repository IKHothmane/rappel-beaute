import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JoinLoyaltyForm } from "@/components/loyalty/join-loyalty-form";
import { previewJoinQr } from "@/lib/loyalty/join-qr";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rejoindre la fidélité",
  robots: { index: false, follow: false },
};

export default async function JoinLoyaltyPage({ params }: { params: { token: string } }) {
  const qr = await previewJoinQr(params.token);
  if (!qr) notFound();

  return (
    <section className="min-h-screen bg-paper py-12">
      <div className="mx-auto max-w-md px-4">
        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-primary">
          {qr.organizationName}
        </p>
        <h1 className="mt-3 text-center font-display text-3xl font-light text-ink">
          Bienvenue chez {qr.organizationName}
        </h1>
        <p className="mt-3 text-center text-sm text-ink/60">
          {qr.visitsPerReward} passages pour {qr.rewardLabel}. Aucun compte n&apos;est demandé.
          Créer la carte ne compte aucun passage.
        </p>
        <JoinLoyaltyForm token={params.token.trim().toUpperCase()} disabled={!qr.active} />
      </div>
    </section>
  );
}
