import Link from "next/link";
import { SiteFooter } from "@/components/www/SiteFooter";
import { SiteHeader } from "@/components/www/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="container-rb py-24">
        <p className="eyebrow">Page introuvable</p>
        <h1 className="mt-3 font-display text-4xl font-semibold">Page introuvable.</h1>
        <p className="mt-3 max-w-md text-ink/65">
          Cette adresse n’existe pas sur la vitrine Rappel Beauté.
        </p>
        <Link href="/" className="btn-primary mt-8 inline-flex">
          Retour à l’accueil
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
