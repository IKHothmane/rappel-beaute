import Link from "next/link";
import type { Metadata } from "next";
import { HomeHero } from "@/components/www/HomeHero";
import { Reveal, RevealItem, RevealStagger } from "@/components/www/Reveal";
import { marketingPageMetadata } from "@/lib/seo";
import { formatPrice, PUBLIC_OFFER, SITE } from "@/lib/site";

export const dynamic = "force-static";

const YEAR_AT_MONTHLY = PUBLIC_OFFER.monthlyPrice * 12;
const YEARLY_SAVINGS = PUBLIC_OFFER.annualSavings;

export const metadata: Metadata = marketingPageMetadata({
  title: "Rappel Beauty – Logiciel de gestion pour institut de beauté au Maroc",
  description: `Rappel Beauty est le logiciel de gestion pour instituts de beauté au Maroc : rendez-vous, clientes, équipe, stock, caisse, fidélité et réservation en ligne. Essai gratuit ${PUBLIC_OFFER.trialDays} jours.`,
  canonical: "/",
});

const BENEFITS = [
  {
    title: "Ne ratez plus aucun rendez-vous",
    text: "Organisez le planning et les disponibilités de votre équipe.",
  },
  {
    title: "Gérez vos clientes facilement",
    text: "Historique, rendez-vous, fidélité et informations clientes au même endroit.",
  },
  {
    title: "Gardez le contrôle de votre caisse",
    text: "Suivez les encaissements, dépenses, paiements et factures.",
  },
  {
    title: "Ne perdez plus de temps avec le stock",
    text: "Suivez vos produits, achats, fournisseurs et niveaux de stock.",
  },
  {
    title: "Recevez des réservations en ligne",
    text: "Votre institut possède sa propre page de réservation.",
  },
  {
    title: "Pilotez votre activité",
    text: "Analysez le chiffre d'affaires, les rendez-vous et l'activité de l'équipe.",
  },
];

const AUDIENCE = [
  "Instituts de beauté",
  "Centres d'esthétique",
  "Instituts de soins visage",
  "Instituts de soins corps",
  "Ongleries",
  "Instituts avec plusieurs cabines",
  "Instituts avec plusieurs employées",
];

const INCLUDED = [
  "Rendez-vous",
  "Clientes",
  "Employées",
  "Stock",
  "Caisse",
  "Réservation en ligne",
  "Fidélité",
  "Marketing",
];

const TRUST = [
  { title: "Pensé pour le marché marocain", text: "Interface en français, prix en dirhams, usage institut." },
  {
    title: "Prix en MAD",
    text: `${PUBLIC_OFFER.monthlyPrice} DH par mois, ou ${formatPrice(PUBLIC_OFFER.annualPrice)} DH par an.`,
  },
  { title: "Ordinateur et téléphone", text: "Application web, dans le navigateur, sans installation." },
  { title: "Accès réservé", text: "Connexion HTTPS. Chaque institut ne voit que ses données." },
  { title: "Réservation en ligne", text: "Une page publique reliée au même agenda." },
  { title: "Assistance", text: `Écrivez à ${SITE.email}.` },
];

const STEPS = [
  {
    n: "1",
    title: "Créez votre institut",
    text: "Configurez vos services, employées et horaires.",
  },
  {
    n: "2",
    title: "Organisez votre activité",
    text: "Gérez vos rendez-vous, clientes, caisse et stock.",
  },
  {
    n: "3",
    title: "Recevez des réservations",
    text: "Publiez votre page et laissez vos clientes réserver en ligne.",
  },
];

const FAQ = [
  {
    q: "Puis-je essayer Rappel Beauty gratuitement ?",
    a: "Oui, pendant 7 jours, sans carte bancaire. L'essai ne devient pas un abonnement tant que vous ne choisissez pas la formule.",
  },
  {
    q: "Puis-je arrêter mon abonnement ?",
    a: "Oui. La formule est sans engagement : aucune durée minimale n'est imposée.",
  },
  {
    q: "Est-ce que Rappel Beauty fonctionne sur téléphone ?",
    a: "Oui, dans le navigateur du téléphone comme sur ordinateur. Ce n'est pas une application à télécharger sur un store.",
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "La connexion est chiffrée en HTTPS. Les comptes d'un institut n'accèdent pas aux données d'un autre. Les photos de clientes ne sont pas collectées.",
  },
  {
    q: "Où sont hébergées mes données ?",
    a: "L'application en ligne est hébergée chez Railway et servie en HTTPS. L'éditeur est précisé dans les mentions légales.",
  },
  {
    q: "Puis-je importer mes clientes ?",
    a: "Les fiches se créent dans Rappel Beauty. Un import de fichier n'est pas disponible pour le moment. Vous pouvez exporter la liste des clientes.",
  },
  {
    q: "Puis-je avoir plusieurs employées et plusieurs cabines ?",
    a: "Oui. Un institut peut organiser plusieurs employées et plusieurs cabines dans le même planning.",
  },
  {
    q: "Puis-je gérer plusieurs instituts ?",
    a: "Chaque formule correspond à un institut. Plusieurs employées et cabines se gèrent dans cet institut.",
  },
  {
    q: "Est-ce que WhatsApp est automatisé ?",
    a: "Non. Rappel Beauty prépare le message (confirmation, rappel, annulation, avis). Vous l'envoyez vous-même depuis WhatsApp. Il n'y a pas de bot.",
  },
  {
    q: "Les clientes paient-elles Rappel Beauty ?",
    a: "Non. Les clientes paient leurs prestations directement à l'institut.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <link
        rel="preload"
        as="image"
        href="/brand/hero-mobile.avif"
        type="image/avif"
        media="(max-width: 767px)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href="/brand/hero.avif"
        type="image/avif"
        media="(min-width: 768px)"
        fetchPriority="high"
      />
      <HomeHero />

      <section className="border-b border-line bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-light text-ink sm:text-4xl">
              Tout ce dont votre institut a besoin
            </h2>
          </Reveal>
          <RevealStagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.05}>
            {BENEFITS.map((item) => (
              <RevealItem key={item.title}>
                <article className="h-full rounded-2xl border border-line bg-paper p-5">
                  <h3 className="text-base font-semibold text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/65">{item.text}</p>
                </article>
              </RevealItem>
            ))}
          </RevealStagger>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-2xl font-light text-ink sm:text-4xl">
              Votre institut peut être réservé en ligne 24h/24
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/65 sm:text-base">
              Vos clientes consultent vos services, voient les disponibilités et demandent leur rendez-vous
              directement depuis votre page.
            </p>
            <Link
              href="/reservation-en-ligne/"
              className="mt-6 inline-flex items-center justify-center rounded-full border border-line bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:border-primary/40"
            >
              Découvrir la réservation en ligne
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="bg-paper py-14 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <h2 className="font-display text-2xl font-light text-ink sm:text-4xl">
              Découvrez l&apos;interface Rappel Beauty
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/65">
              Rendez-vous, clientes, équipe, stock, caisse et réservation en ligne se retrouvent dans la
              même application.
            </p>
            <Link
              href="/fonctionnalites/"
              className="mt-6 inline-flex text-sm font-semibold text-primary hover:text-primary-dark"
            >
              Voir comment ça fonctionne
            </Link>
          </Reveal>
          <figure>
            <div
              className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm"
              aria-hidden
            >
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <p className="text-sm font-semibold text-ink">Rappel Beauty</p>
                <p className="text-xs text-ink/45">Aujourd&apos;hui</p>
              </div>
              <div className="px-4 pt-4">
                <p className="text-sm text-ink/70">Bonjour</p>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4">
                <div className="rounded-xl bg-primary-light/50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                    RDV aujourd&apos;hui
                  </p>
                  <p className="mt-2 font-display text-2xl text-ink">18</p>
                </div>
                <div className="rounded-xl bg-primary-light/50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                    CA aujourd&apos;hui
                  </p>
                  <p className="mt-2 font-display text-2xl text-ink">4 850 DH</p>
                </div>
                {[
                  ["Agenda", "Planning du jour"],
                  ["Clientes", "Fiches et historique"],
                  ["Stock", "Produits et alertes"],
                  ["Caisse", "Encaissements"],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-xl border border-line p-3">
                    <p className="text-sm font-semibold text-ink">{title}</p>
                    <p className="mt-1 text-xs text-ink/55">{text}</p>
                  </div>
                ))}
              </div>
            </div>
            <figcaption className="mt-3 text-center text-xs text-ink/50">
              Illustration de l&apos;interface Rappel Beauty.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="border-y border-line bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center">
            <h2 className="font-display text-2xl font-light text-ink sm:text-4xl">Commencez en 3 étapes</h2>
          </Reveal>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="rounded-2xl border border-line bg-paper p-6">
                <p className="text-sm font-semibold text-primary">Étape {step.n}</p>
                <h3 className="mt-2 text-lg font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/65">{step.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-center">
            <Link
              href="/professionnel/"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              Commencer gratuitement
            </Link>
          </p>
        </div>
      </section>

      <section className="bg-paper py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-light text-ink sm:text-4xl">
            Réservation en ligne pour vos clientes
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/65">
            La page publique affiche vos services et les créneaux du planning. La cliente réserve auprès
            de votre institut, et le rendez-vous arrive dans le même agenda. Elle paie à l&apos;institut.
          </p>
          <p className="mt-4">
            <Link href="/reservation-en-ligne/" className="text-sm font-semibold text-primary hover:text-primary-dark">
              Découvrir la réservation en ligne
            </Link>
          </p>
        </div>
      </section>

      <section className="border-y border-line bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-light text-ink sm:text-4xl">
            Conçu pour les instituts de beauté marocains
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/65">
            Rappel Beauty s&apos;adresse aux instituts qui travaillent au Maroc, avec une équipe, des cabines
            et une caisse en dirhams.
          </p>
          <ul className="mt-8 flex flex-wrap gap-2">
            {AUDIENCE.map((item) => (
              <li key={item} className="rounded-full border border-line bg-paper px-4 py-2 text-sm text-ink">
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TRUST.map((item) => (
              <article key={item.title} className="rounded-2xl border border-line p-5">
                <h3 className="text-base font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/65">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-paper py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-[11px]">
            Une formule
          </p>
          <p className="mt-3 font-display text-4xl text-ink">{PUBLIC_OFFER.monthlyPrice} DH / mois</p>
          <p className="mt-2 text-sm font-semibold text-ink/70">
            ou {formatPrice(PUBLIC_OFFER.annualPrice)} DH / an
          </p>
          <p className="mt-4 text-sm font-semibold text-primary">
            Économisez {YEARLY_SAVINGS.toLocaleString("fr-FR")} DH avec la formule annuelle
          </p>
          <p className="mt-1 text-xs text-ink/55">
            {PUBLIC_OFFER.monthlyPrice} DH × 12 = {formatPrice(YEAR_AT_MONTHLY)} DH, contre{" "}
            {formatPrice(PUBLIC_OFFER.annualPrice)} DH par an.
          </p>
          <ul className="mx-auto mt-8 grid max-w-lg gap-2 text-left text-sm text-ink sm:grid-cols-2">
            {INCLUDED.map((item) => (
              <li key={item} className="rounded-lg border border-line bg-white px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-ink/60">7 jours gratuits · Sans carte bancaire · Sans engagement</p>
          <Link
            href="/professionnel/"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            Essai gratuit 7 jours
          </Link>
        </div>
      </section>

      <section className="border-t border-line bg-primary-light/20 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center font-display text-2xl font-light text-ink sm:text-3xl">
            Questions fréquentes
          </h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="rounded-xl border border-line bg-paper p-4 sm:p-5">
                <summary className="cursor-pointer text-sm font-medium text-ink sm:text-base">{item.q}</summary>
                <p className="mt-3 text-sm leading-relaxed text-ink/65">{item.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-ink/55">
            WhatsApp est détaillé sur la{" "}
            <Link href="/whatsapp/" className="font-semibold text-primary hover:text-primary-dark">
              page WhatsApp manuel
            </Link>
            . Plus de réponses sur la{" "}
            <Link href="/faq/" className="font-semibold text-primary hover:text-primary-dark">
              page FAQ
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="bg-institut py-14 text-center text-white sm:py-20">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="font-display text-2xl font-light sm:text-4xl">Prêt à gérer votre institut ?</h2>
          <p className="mt-4 text-sm text-white/75 sm:text-base">
            7 jours pour essayer, sans carte bancaire et sans engagement.
          </p>
          <Link
            href="/professionnel/"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Commencer gratuitement
          </Link>
        </div>
      </section>
    </>
  );
}
