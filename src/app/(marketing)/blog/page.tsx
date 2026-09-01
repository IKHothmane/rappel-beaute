import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/www/PageHero";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Blog",
  description: "Journal Rappel Beauté — articles à venir.",
};

export default function BlogPage() {
  return (
    <>
      <PageHero
        eyebrow="Blog"
        title="Les articles arriveront avec le lancement."
        text="Placeholder V1. Guides métier, cas d’instituts et notes produit seront publiés ici."
      />
      <div className="container-rb py-16">
        <p className="max-w-xl text-sm text-ink/60">
          En attendant, la FAQ et les pages fonctionnalités couvrent le produit.
        </p>
      </div>
    </>
  );
}
