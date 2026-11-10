import Image from "next/image";
import Link from "next/link";

type Shot = {
  id: "agenda" | "clientes" | "caisse" | "fidelite" | "services" | "stock" | "reservation";
  src: string;
  alt: string;
  width: number;
  height: number;
  href: string;
  title: string;
};

const SHOTS: Shot[] = [
  {
    id: "agenda",
    src: "/site/rappelbeauty-agenda-pc-complet-2200x1270.webp",
    alt: "Agenda Rappel Beauty sur ordinateur",
    width: 2200,
    height: 1270,
    href: "/gestion-rendez-vous/",
    title: "Agenda intelligent",
  },
  {
    id: "clientes",
    src: "/site/rappelbeauty-clientes-pc-reel.webp",
    alt: "Gestion des clientes Rappel Beauty sur ordinateur",
    width: 2200,
    height: 1230,
    href: "/gestion-clientes/",
    title: "Gestion des clientes",
  },
  {
    id: "caisse",
    src: "/site/rappelbeauty-caisse-pc-reel.webp",
    alt: "Caisse Rappel Beauty sur ordinateur",
    width: 2200,
    height: 1250,
    href: "/caisse/",
    title: "Caisse et finances",
  },
  {
    id: "fidelite",
    src: "/site/rappelbeauty-fidelite-pc-reel.webp",
    alt: "Carte de fidélité Rappel Beauty",
    width: 2200,
    height: 1250,
    href: "/fidelite/",
    title: "Fidélité",
  },
  {
    id: "services",
    src: "/marketing/screen-services.png",
    alt: "Services et prestations Rappel Beauty sur ordinateur",
    width: 1536,
    height: 1024,
    href: "/fonctionnalites/#services",
    title: "Services et prestations",
  },
  {
    id: "stock",
    src: "/site/rappelbeauty-produits-stock-pc-reel.webp",
    alt: "Stock et produits Rappel Beauty sur ordinateur",
    width: 2200,
    height: 1200,
    href: "/gestion-stock/",
    title: "Stock et produits",
  },
  {
    id: "reservation",
    src: "/marketing/reservation-en-ligne.png",
    alt: "Réservation en ligne pour un institut de beauté",
    width: 1536,
    height: 1024,
    href: "/reservation-en-ligne/",
    title: "Réservation en ligne",
  },
];

export function ProductShot({ view }: { view: Shot["id"] }) {
  const shot = SHOTS.find((item) => item.id === view);
  if (!shot) return null;
  const { src, alt, width, height } = shot;

  return (
    <figure className="px-4 pb-2 pt-2 sm:px-6">
      <div className="mx-auto max-w-5xl">
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

export function ModuleIndex({
  items,
}: {
  items: readonly { title: string; text: string; href: string }[];
}) {
  return (
    <ul className="grid border-y border-ink/15 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.href} className="border-b border-ink/15 sm:odd:border-r">
          <Link href={item.href} className="group block py-6 pr-6 transition hover:text-primary">
            <span className="font-semibold text-ink group-hover:text-primary">{item.title}</span>
            <span className="mt-2 block text-sm leading-relaxed text-ink/70">{item.text}</span>
          </Link>
        </li>
      ))}
    </ul>
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
