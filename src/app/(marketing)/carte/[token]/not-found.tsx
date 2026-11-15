import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { LoyaltyStateCard } from "@/components/loyalty/loyalty-state-card";

export const metadata: Metadata = {
  title: "Carte introuvable",
  robots: { index: false, follow: false },
};

export default function LoyaltyCardNotFound() {
  return (
    <LoyaltyStateCard icon={<SearchX size={32} strokeWidth={1.75} />} title="Nous ne trouvons pas cette carte">
      <p>Ce lien ne correspond à aucune carte de fidélité active.</p>
      <p className="text-[0.9375rem] text-[#6B5763]">
        Scannez à nouveau le QR code de l’institut pour retrouver ou créer votre carte. Si vous avez saisi le lien à la main,
        vérifiez qu’il est complet. Sinon, demandez de l’aide à l’équipe.
      </p>
    </LoyaltyStateCard>
  );
}
