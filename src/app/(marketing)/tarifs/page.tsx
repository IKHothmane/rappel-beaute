import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Crown, CreditCard, Headphones, ShieldCheck } from "lucide-react";
import { CheckList, FaqAccordion, SpaCutout } from "@/components/www/blocks";
import { JsonLd } from "@/components/www/JsonLd";
import { faqPageJsonLd, marketingPageMetadata } from "@/lib/seo";
import { formatPrice, PUBLIC_OFFER } from "@/lib/site";
import "./tarifs.css";

export const dynamic = "force-static";

export const metadata = marketingPageMetadata({
  title: "Tarifs Rappel Beauty – Logiciel institut de beauté au Maroc",
  description: `Rappel Beauty à ${PUBLIC_OFFER.monthlyPrice} DH/mois ou ${formatPrice(PUBLIC_OFFER.annualPrice)} DH/an. ${PUBLIC_OFFER.trialDays} jours gratuits, sans carte bancaire et sans engagement. Gérez votre institut de beauté simplement.`,
  canonical: "/tarifs/",
});

const FEATURES = ["Accès complet à toutes les fonctionnalités", "Gestion de votre équipe", "Support en français", "Mises à jour incluses"];
const TRUST = [
  { icon: CalendarDays, title: "Essai gratuit", text: `${PUBLIC_OFFER.trialDays} jours` },
  { icon: CreditCard, title: "Sans carte", text: "bancaire" },
  { icon: ShieldCheck, title: "Sans", text: "engagement" },
  { icon: Headphones, title: "Support", text: "en français" },
];
const FAQS = [
  {
    question: `L’essai gratuit de ${PUBLIC_OFFER.trialDays} jours est-il vraiment sans engagement ?`,
    answer: `Oui, vous pouvez tester les fonctionnalités pendant ${PUBLIC_OFFER.trialDays} jours, sans carte bancaire et sans obligation de continuer.`,
  },
  {
    question: "Quelle est la différence entre la formule mensuelle et annuelle ?",
    answer: `Les deux formules incluent les mêmes fonctionnalités. La formule mensuelle coûte ${formatPrice(PUBLIC_OFFER.monthlyPrice)} DH par mois. La formule annuelle coûte ${formatPrice(PUBLIC_OFFER.annualPrice)} DH par an, soit ${formatPrice(PUBLIC_OFFER.annualSavings)} DH d’économie par rapport à douze mensualités.`,
  },
  {
    question: "Puis-je changer de formule plus tard ?",
    answer: "Contactez notre équipe pour organiser un changement de formule et connaître les modalités applicables à votre abonnement.",
  },
  {
    question: "Le support est-il inclus ?",
    answer: "Oui, le support en français et les mises à jour sont inclus dans les deux formules. Notre équipe vous accompagne dans l’utilisation de Rappel Beauty.",
  },
  {
    question: "Que comprend mon abonnement ?",
    answer: "Vous retrouvez les rendez-vous, les fiches clientes, la caisse, les paiements, les produits et stocks, le planning de l’équipe, la fidélité et les outils de pilotage dans un seul logiciel.",
  },
];

export default function TarifsPage() {
  const annualEquivalent = PUBLIC_OFFER.monthlyPrice * 12;
  const discount = Math.round((PUBLIC_OFFER.annualSavings / annualEquivalent) * 100);

  return (
    <div className="tp">
      <JsonLd data={faqPageJsonLd(FAQS)} />
      <div className="tp-wrap">
        <section className="tp-hero" aria-labelledby="tarifs-title">
          <div className="tp-hero-copy">
            <span className="tp-badge">Tarifs</span>
            <h1 id="tarifs-title">Nos formules<br /><em>Tarifaires</em></h1>
            <p className="tp-lead">Un logiciel complet, simple et sans engagement pour gérer votre institut de beauté au Maroc.</p>
            <CheckList className="tp-promises" items={["Toutes les fonctionnalités incluses", "Support en français", "Sans engagement"]} />
          </div>
          <div className="tp-visual">
            <SpaCutout className="tp-spa" sizes="(max-width: 700px) 140px, 280px" />
            <Image className="tp-laptop" src="/site/rappelbeauty-dashboard-pc-reel.webp" alt="Tableau de bord Rappel Beauty affiché sur un ordinateur portable" width={2200} height={1270} sizes="(max-width: 700px) 100vw, 60vw" priority />
          </div>
        </section>

        <section className="tp-plans" aria-label="Choisissez votre formule">
          {[false, true].map((annual) => (
            <article className={`tp-plan${annual ? " tp-plan-annual" : ""}`} key={annual ? "annual" : "monthly"}>
              {annual && <><span className="tp-best"><Crown aria-hidden="true" />Le plus avantageux</span><span className="tp-ribbon"><Crown aria-hidden="true" /></span></>}
              <div className="tp-plan-heading">
                <span className="tp-icon"><CalendarDays aria-hidden="true" /></span>
                <div><h2>Formule {annual ? "Annuelle" : "Mensuelle"}</h2><p>{annual ? `Économisez ${formatPrice(PUBLIC_OFFER.annualSavings)} DH par an` : "Idéale pour démarrer en toute flexibilité"}</p></div>
              </div>
              <p className="tp-price"><strong>{formatPrice(annual ? PUBLIC_OFFER.annualPrice : PUBLIC_OFFER.monthlyPrice)} <span>DH</span></strong><span>/ {annual ? "an" : "mois"}</span>{annual && <span className="tp-discount"><s>{formatPrice(annualEquivalent)} DH</s><b>−{discount} %</b></span>}</p>
              <CheckList className="tp-feature-list" items={FEATURES} />
              <Link className="tp-button" href="/professionnel/">{annual ? "Essayer la formule annuelle" : "Commencer maintenant"}<ArrowRight aria-hidden="true" /></Link>
            </article>
          ))}
        </section>

        <div className="tp-trust">{TRUST.map(({ icon: Icon, title, text }) => <div className="tp-trust-item" key={title}><span className="tp-icon"><Icon aria-hidden="true" /></span><p>{title}<br />{text}</p></div>)}</div>
        <p className="tp-included">Un seul abonnement pour tout votre institut. <Link href="/fonctionnalites/">Découvrir les fonctionnalités <ArrowRight aria-hidden="true" /></Link></p>

        <section className="tp-faq" aria-labelledby="tarifs-faq-title">
          <div className="tp-faq-intro"><span className="tp-badge">FAQ Tarifs</span><h2 id="tarifs-faq-title">Questions<br />fréquentes</h2><p>Tout ce que vous devez savoir sur nos tarifs et notre offre.</p><SpaCutout className="tp-faq-spa" sizes="240px" /></div>
          <div className="tp-questions"><FaqAccordion faqs={FAQS} openFirst /><Link className="tp-contact" href="/contact/">Une autre question ? Contactez-nous <ArrowRight aria-hidden="true" /></Link></div>
        </section>

        <section className="tp-cta" aria-labelledby="tarifs-cta-title"><CalendarDays className="tp-cta-icon" aria-hidden="true" /><div><h2 id="tarifs-cta-title">Prêt(e) à simplifier la gestion de votre institut ?</h2><p>Lancez votre essai gratuit dès aujourd’hui et découvrez Rappel Beauty.</p></div><Link className="tp-button" href="/professionnel/">Essayer {PUBLIC_OFFER.trialDays} jours<ArrowRight aria-hidden="true" /></Link></section>
      </div>
    </div>
  );
}
