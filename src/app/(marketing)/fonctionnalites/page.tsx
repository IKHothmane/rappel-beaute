import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/www/Reveal";
import { SeoCloser } from "@/components/www/SeoCloser";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Fonctionnalités du logiciel pour institut de beauté",
  description:
    "Découvrez les fonctionnalités de Rappel Beauty pour gérer votre institut de beauté au Maroc : rendez-vous, clientes, équipe, services, stock, caisse, fidélité et réservation en ligne.",
  alternates: {
    canonical: "/fonctionnalites/",
  },
};

const NAV = [
  { id: "rdv", label: "Rendez-vous" },
  { id: "clientes", label: "Clientes" },
  { id: "equipe", label: "Équipe" },
  { id: "services", label: "Services" },
  { id: "stock", label: "Stock" },
  { id: "caisse", label: "Caisse" },
  { id: "croissance", label: "Croissance" },
  { id: "reservation", label: "Réservation" },
  { id: "analytics", label: "Pilotage" },
] as const;

const FAQ = [
  {
    q: "Rappel Beauty est-il une marketplace ?",
    a: "Non. C'est un logiciel de gestion pour l'institut. La page publique et la réservation en ligne sont des fonctions du logiciel, pas une place de marché.",
  },
  {
    q: "Les clientes paient-elles en ligne ?",
    a: "Non. Les clientes paient directement à l'institut. Le retrait des produits se fait aussi à l'institut.",
  },
  {
    q: "Comment fonctionne WhatsApp ?",
    a: "En V1, WhatsApp est assisté : le logiciel prépare le message, une personne de l'institut l'envoie. Il n'y a pas d'envoi automatique.",
  },
  {
    q: "La réservation en ligne est-elle incluse ?",
    a: "Oui. L'institut peut publier sa page, afficher ses services et ses disponibilités, et laisser ses clientes prendre rendez-vous.",
  },
] as const;

function Items({ items }: { items: { id?: string; label: string }[] }) {
  return (
    <ul className="mt-6 grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item.label}
          id={item.id}
          className="scroll-mt-36 rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink"
        >
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export default function FonctionnalitesPage() {
  return (
    <>
      <section className="border-b border-line bg-paper py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Reveal>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-[11px]">
              Logiciel pour instituts de beauté au Maroc
            </p>
            <h1 className="mt-3 font-display text-3xl font-light leading-tight tracking-tight text-ink sm:text-5xl">
              Logiciel de gestion pour institut de beauté
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-ink/70 sm:text-lg">
              Rappel Beauty est un logiciel de gestion pour les instituts de beauté au Maroc.
              Cette page décrit ce qu&apos;il permet de faire : rendez-vous, clientes, équipe,
              services, stock, caisse, fidélité et réservation en ligne.
            </p>
            <Link
              href="/professionnel/"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
            >
              Essayer gratuitement 7 jours
            </Link>
            <p className="mt-4 text-xs text-ink/55 sm:text-sm">
              Sans engagement · 7 jours gratuits · Sans carte bancaire
            </p>
          </Reveal>
        </div>
      </section>

      <nav
        aria-label="Sommaire des fonctionnalités"
        className="sticky top-[5.5rem] z-40 border-b border-line bg-white/95 backdrop-blur-md md:top-24"
      >
        <div className="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
          {NAV.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="whitespace-nowrap rounded-full border border-line bg-paper px-3.5 py-1.5 text-xs font-medium text-ink/70 transition hover:border-primary/40 hover:text-primary"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-3xl space-y-16 px-4 py-14 sm:px-6 sm:py-20">
        <Reveal>
          <section id="rdv" className="scroll-mt-36">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Rendez-vous
            </p>
            <h2 className="mt-2 font-display text-2xl font-light text-ink sm:text-4xl">
              Agenda &amp; rendez-vous
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/70 sm:text-base">
              Organisez les rendez-vous de votre institut, visualisez les disponibilités de votre
              équipe et gérez votre planning depuis un seul agenda.
            </p>
            <Items
              items={[
                { label: "Agenda" },
                { label: "Rendez-vous" },
                { label: "Planning équipe" },
                { label: "Liste d'attente" },
                { label: "Disponibilités" },
              ]}
            />
            <p className="mt-4">
              <Link
                href="/gestion-rendez-vous/"
                className="text-sm font-semibold text-primary hover:text-primary-dark"
              >
                Découvrir la gestion des rendez-vous
              </Link>
            </p>
          </section>
        </Reveal>

        <Reveal>
          <section id="clientes" className="scroll-mt-36 border-t border-line pt-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Clientes
            </p>
            <h2 className="mt-2 font-display text-2xl font-light text-ink sm:text-4xl">Clientes</h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/70 sm:text-base">
              Gardez la fiche de chaque cliente, son historique de soins et les leviers pour la
              faire revenir, sans photo cliente en V1.
            </p>
            <Items
              items={[
                { label: "Fiches clientes" },
                { label: "Historique" },
                { id: "fidelite", label: "Fidélité" },
                { label: "Réactivation" },
              ]}
            />
            <p className="mt-4">
              <Link
                href="/gestion-clientes/"
                className="text-sm font-semibold text-primary hover:text-primary-dark"
              >
                Découvrir la gestion des clientes
              </Link>
            </p>
            <p className="mt-2">
              <Link
                href="/fidelite/"
                className="text-sm font-semibold text-primary hover:text-primary-dark"
              >
                Découvrir la fidélité
              </Link>
            </p>
          </section>
        </Reveal>

        <Reveal>
          <section id="equipe" className="scroll-mt-36 border-t border-line pt-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Équipe
            </p>
            <h2 className="mt-2 font-display text-2xl font-light text-ink sm:text-4xl">Équipe</h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/70 sm:text-base">
              Organisez les employées, leur planning, leurs commissions et les droits d&apos;accès
              selon le rôle de chacune.
            </p>
            <Items
              items={[
                { label: "Employées" },
                { label: "Planning" },
                { label: "Commissions" },
                { label: "Permissions" },
              ]}
            />
          </section>
        </Reveal>

        <Reveal>
          <section id="services" className="scroll-mt-36 border-t border-line pt-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Services &amp; ressources
            </p>
            <h2 className="mt-2 font-display text-2xl font-light text-ink sm:text-4xl">
              Services &amp; ressources
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/70 sm:text-base">
              Décrivez vos prestations, vos cabines et vos tarifs, puis reliez-les aux
              disponibilités réelles de l&apos;institut.
            </p>
            <Items
              items={[
                { label: "Services" },
                { label: "Cabines / ressources" },
                { label: "Tarifs" },
                { label: "Disponibilités" },
              ]}
            />
          </section>
        </Reveal>

        <Reveal>
          <section id="stock" className="scroll-mt-36 border-t border-line pt-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Produits &amp; stock
            </p>
            <h2 className="mt-2 font-display text-2xl font-light text-ink sm:text-4xl">
              Produits &amp; stock
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/70 sm:text-base">
              Suivez les produits utilisés en cabine et vendus au comptoir, les fournisseurs, les
              achats et les alertes de stock.
            </p>
            <Items
              items={[
                { label: "Produits" },
                { label: "Stock" },
                { label: "Fournisseurs" },
                { label: "Achats" },
                { label: "Alertes" },
              ]}
            />
            <p className="mt-4">
              <Link
                href="/gestion-stock/"
                className="text-sm font-semibold text-primary hover:text-primary-dark"
              >
                Découvrir la gestion du stock
              </Link>
            </p>
          </section>
        </Reveal>

        <Reveal>
          <section id="caisse" className="scroll-mt-36 border-t border-line pt-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Caisse &amp; finances
            </p>
            <h2 className="mt-2 font-display text-2xl font-light text-ink sm:text-4xl">
              Caisse &amp; finances
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/70 sm:text-base">
              Encaissez les soins et les produits, suivez les paiements et les dépenses, et
              émettez les factures depuis la même caisse.
            </p>
            <Items
              items={[
                { label: "Caisse" },
                { label: "Point de vente" },
                { label: "Paiements" },
                { label: "Dépenses" },
                { label: "Facturation" },
              ]}
            />
            <p className="mt-4">
              <Link
                href="/caisse/"
                className="text-sm font-semibold text-primary hover:text-primary-dark"
              >
                Découvrir la gestion de la caisse
              </Link>
            </p>
          </section>
        </Reveal>

        <Reveal>
          <section id="croissance" className="scroll-mt-36 border-t border-line pt-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Croissance
            </p>
            <h2 className="mt-2 font-display text-2xl font-light text-ink sm:text-4xl">
              Croissance
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/70 sm:text-base">
              Préparez vos offres, vos cartes cadeaux et vos messages. WhatsApp reste assisté :
              une personne de l&apos;institut envoie le message.
            </p>
            <Items
              items={[
                { id: "promotions", label: "Promotions" },
                { label: "Cartes cadeaux" },
                { label: "Marketing" },
                { id: "whatsapp", label: "WhatsApp assisté" },
                { id: "avis", label: "Avis" },
              ]}
            />
          </section>
        </Reveal>

        <Reveal>
          <section id="reservation" className="scroll-mt-36 border-t border-line pt-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Réservation en ligne
            </p>
            <h2 className="mt-2 font-display text-2xl font-light text-ink sm:text-4xl">
              Réservation en ligne
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/70 sm:text-base">
              Donnez à votre institut une page publique pour présenter vos services, afficher vos
              disponibilités et permettre aux clientes de prendre rendez-vous. Les clientes paient
              directement à l&apos;institut.
            </p>
            <Items
              items={[
                { label: "Page publique de l'institut" },
                { label: "Services" },
                { label: "Disponibilités" },
                { label: "Rendez-vous" },
                { label: "Produits" },
                { label: "Retrait à l'institut" },
              ]}
            />
            <p className="mt-4">
              <Link
                href="/reservation-en-ligne/"
                className="text-sm font-semibold text-primary hover:text-primary-dark"
              >
                Découvrir la réservation en ligne
              </Link>
            </p>
          </section>
        </Reveal>

        <Reveal>
          <section id="analytics" className="scroll-mt-36 border-t border-line pt-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Pilotage
            </p>
            <h2 className="mt-2 font-display text-2xl font-light text-ink sm:text-4xl">Pilotage</h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/70 sm:text-base">
              Consultez l&apos;activité de l&apos;institut, les rapports et les notifications, avec
              un assistant IA dans l&apos;application.
            </p>
            <Items
              items={[
                { label: "Analytics" },
                { label: "Rapports" },
                { label: "Notifications" },
                { label: "Assistant IA" },
              ]}
            />
          </section>
        </Reveal>
      </div>

      <SeoCloser
        problem="L'agenda est dans un cahier, les clientes dans WhatsApp, le stock dans un fichier et la caisse dans un autre outil. Le soir, personne ne retrouve la même journée."
        solution="Rappel Beauty réunit rendez-vous, clientes, équipe, stock, caisse, fidélité et réservation en ligne. C'est le logiciel de l'institut, pas une place de marché."
        useCase="Une patronne à Casablanca ouvre le planning du matin, voit la cabine déjà prise, encaisse le soin à la fin et retrouve la fiche de la cliente sans changer d'application."
      />
      <section className="border-t border-line bg-primary-light/20 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center font-display text-2xl font-light text-ink sm:text-3xl">
            Questions fréquentes
          </h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-line bg-paper p-4 sm:p-5"
              >
                <summary className="cursor-pointer text-sm font-medium text-ink sm:text-base">
                  {item.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ink/60">{item.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-ink/55">
            Le détail des prix est sur la{" "}
            <Link href="/tarifs/" className="font-semibold text-primary hover:text-primary-dark">
              page tarifs
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="bg-institut py-14 text-center text-white sm:py-20">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="font-display text-2xl font-light sm:text-4xl">
            Essayez Rappel Beauty pendant 7 jours
          </h2>
          <p className="mt-4 text-sm text-white/75 sm:text-base">
            Sans engagement et sans carte bancaire.
          </p>
          <Link
            href="/professionnel/"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Essayer gratuitement 7 jours
          </Link>
        </div>
      </section>
    </>
  );
}
