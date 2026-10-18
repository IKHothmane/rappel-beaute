import Image from "next/image";
import Link from "next/link";

type Shot = {
  src: string;
  alt: string;
  width: number;
  height: number;
  href: string;
  title: string;
};

const SHOTS: Shot[] = [
  {
    src: "/marketing/screen-agenda.png",
    alt: "Agenda Rappel Beauty sur ordinateur",
    width: 612,
    height: 408,
    href: "/gestion-rendez-vous/",
    title: "Agenda intelligent",
  },
  {
    src: "/marketing/screen-clientes.png",
    alt: "Gestion des clientes Rappel Beauty sur ordinateur",
    width: 1536,
    height: 1024,
    href: "/gestion-clientes/",
    title: "Gestion des clientes",
  },
  {
    src: "/marketing/screen-caisse.png",
    alt: "Caisse Rappel Beauty sur ordinateur",
    width: 1536,
    height: 1024,
    href: "/caisse/",
    title: "Caisse et finances",
  },
  {
    src: "/marketing/screen-fidelite.png",
    alt: "Carte de fidélité Rappel Beauty",
    width: 1536,
    height: 1024,
    href: "/fidelite/",
    title: "Fidélité",
  },
  {
    src: "/marketing/screen-services.png",
    alt: "Services et prestations Rappel Beauty sur ordinateur",
    width: 1536,
    height: 1024,
    href: "/fonctionnalites/#services",
    title: "Services et prestations",
  },
  {
    src: "/marketing/screen-stock.png",
    alt: "Stock et produits Rappel Beauty sur ordinateur",
    width: 1536,
    height: 1024,
    href: "/gestion-stock/",
    title: "Stock et produits",
  },
  {
    src: "/marketing/reservation-en-ligne.png",
    alt: "Réservation en ligne pour un institut de beauté",
    width: 1536,
    height: 1024,
    href: "/reservation-en-ligne/",
    title: "Réservation en ligne",
  },
];

export function ProductShot({
  src,
  alt,
  width,
  height,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
}) {
  return (
    <figure className="bg-[#fff8fb] px-4 pb-2 pt-2 sm:px-6">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-pink-100 bg-white p-1.5 shadow-[0_24px_65px_-30px_rgba(190,24,93,0.32)]">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes="(max-width: 1024px) 100vw, 960px"
          className="h-auto w-full object-contain"
        />
      </div>
    </figure>
  );
}

export function ShowcaseStrip() {
  return (
    <section aria-label="Aperçu du logiciel" className="bg-[#fff8fb] px-4 py-10 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SHOTS.map((shot) => (
          <Link
            key={shot.href}
            href={shot.href}
            className="group overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-[0_16px_40px_-28px_rgba(190,24,93,0.45)] transition hover:-translate-y-0.5 motion-reduce:transform-none"
          >
            <Image
              src={shot.src}
              alt={shot.alt}
              width={shot.width}
              height={shot.height}
              sizes="(max-width: 768px) 100vw, 33vw"
              className="h-auto w-full object-contain transition duration-500 group-hover:scale-[1.02] motion-reduce:transform-none"
            />
            <span className="block px-4 py-3 text-sm font-semibold text-ink">
              {shot.title} <span className="text-primary" aria-hidden="true">→</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
