import type { Metadata } from "next";
import { PageHero } from "@/components/www/PageHero";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Le journal Rappel Beauty : conseils et actualités pour les instituts de beauté au Maroc. Articles à venir.",
  robots: { index: false, follow: false },
};

export default function BlogPage() {
  return (
    <>
      <PageHero
        eyebrow="Blog"
        title="Les articles arrivent bientôt."
        text="Guides métier, cas d’instituts et nouveautés seront publiés ici."
      />
      <div className="container-rb py-[var(--vt-space-3rem)]">
        <p className="max-w-[var(--vt-size-36rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] text-ink/60">
          En attendant, la FAQ et les pages fonctionnalités couvrent le produit.
        </p>
      </div>
    </>
  );
}
