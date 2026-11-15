"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { LoyaltyStateCard } from "@/components/loyalty/loyalty-state-card";

export default function LoyaltyCardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <LoyaltyStateCard
      icon={<TriangleAlert size={32} strokeWidth={1.75} />}
      title="Votre carte ne s’affiche pas"
      actions={
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              router.refresh();
              reset();
            })
          }
          className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#A83E70] px-4 text-base font-bold text-white transition hover:bg-[#8F3360] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#3A2533] disabled:opacity-60"
        >
          {pending ? "Nouvelle tentative…" : "Réessayer"}
        </button>
      }
    >
      <p>Un problème technique est survenu. Votre carte et vos passages ne sont pas perdus.</p>
      <p className="text-[0.9375rem] text-[#6B5763]">
        Réessayez dans un instant. Si cela continue, scannez à nouveau le QR code de l’institut.
      </p>
    </LoyaltyStateCard>
  );
}
