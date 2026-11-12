import type { Metadata } from "next";
import { PageHero } from "@/components/www/PageHero";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Blog",
  description: "Journal Rappel Beauté — articles à venir.",
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
      <div className="container-rb py-12">
        <p className="max-w-xl text-sm text-ink/60">
          En attendant, la FAQ et les pages fonctionnalités couvrent le produit.
        </p>
      </div>
    </>
  );
}
