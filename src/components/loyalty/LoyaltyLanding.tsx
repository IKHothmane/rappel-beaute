import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, CalendarDays, Check, CheckCircle2, ChevronDown, Gift, Heart, PlayCircle, QrCode, Settings, Smartphone, Sparkles, Star, Trophy, Users, WalletCards } from "lucide-react";
import { PUBLIC_OFFER } from "@/lib/site";

type LoyaltySection = { id: string; title: string; text: string };

const steps = [
  { icon: CalendarDays, title: "La cliente vient au salon", text: "Vous réalisez sa prestation." },
  { icon: QrCode, title: "Son passage est validé", text: "L’institut enregistre le passage éligible." },
  { icon: BarChart3, title: "Sa progression évolue", text: "Selon les règles de votre programme." },
  { icon: Gift, title: "Elle débloque un avantage", text: "Une récompense définie par vos soins." },
  { icon: Trophy, title: "La relation se renforce", text: "Un suivi personnalisé à chaque visite." },
] as const;

const benefits = [
  { icon: Users, title: "Une relation durable", text: "Retrouvez la fidélité et l’historique de chaque cliente." },
  { icon: BarChart3, title: "Des visites valorisées", text: "Récompensez l’activité réellement enregistrée." },
  { icon: Star, title: "Une expérience moderne", text: "Une carte digitale accessible sur mobile." },
  { icon: Settings, title: "Votre programme", text: "Définissez vos règles et vos récompenses." },
] as const;

const faqs = [
  { q: "Un rendez-vous annulé donne-t-il des points ?", a: "Non. Les points suivent un paiement enregistré, pas le seul fait d’avoir pris rendez-vous." },
  { q: "Où voit-on le solde ?", a: "Sur la fiche cliente, avec le niveau et les derniers mouvements." },
] as const;

function LoyaltyCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`fl-phone${compact ? " fl-phone-small" : ""}`} role="img" aria-label="Exemple illustratif de carte de fidélité digitale, avec une progression de sept passages sur dix">
      <div aria-hidden="true">
        <div className="fl-notch" />
        <div className="fl-card-brand"><Heart /><b>Rappel Beauty</b><span>Carte de fidélité</span></div>
        <div className="fl-pass">
          <div className="fl-pass-top"><span>MON INSTITUT</span><QrCode /></div>
          <strong>Ma carte beauté</strong>
          <div className="fl-progress-label"><span>Ma progression</span><b>7 / 10</b></div>
          <div className="fl-hearts">{Array.from({ length: 10 }, (_, index) => <Heart key={index} className={index < 7 ? "is-earned" : ""} />)}</div>
          <div className="fl-reward"><Gift /><span>Votre prochain avantage<br /><b>se rapproche à chaque visite</b></span></div>
          <div className="fl-wallet-label"><WalletCards /> Ma carte sur mon mobile</div>
        </div>
        <span className="fl-example">Exemple de programme</span>
      </div>
    </div>
  );
}

export function LoyaltyLanding({ sections }: { sections: readonly LoyaltySection[] }) {
  return (
    <div className="fl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(faq => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })) }).replace(/</g, "\\u003c") }} />
      <section className="fl-wrap fl-hero">
        <div>
          <span className="fl-badge"><Gift aria-hidden="true" /> Programme de fidélité</span>
          <h1>Fidélisez vos clientes et <em>boostez votre activité</em></h1>
          <p className="fl-lead">Un programme de fidélité simple, moderne et digital pour récompenser vos clientes, suivre leurs avantages et leur donner envie de revenir.</p>
          <div className="fl-actions"><Link href="/professionnel/">Activer la fidélité <ArrowRight aria-hidden="true" /></Link><Link href="/demo/"><PlayCircle aria-hidden="true" /> Voir la démo</Link></div>
          <ul className="fl-promises">{["Carte digitale", "Suivi des avantages", "Récompenses personnalisées"].map(text => <li key={text}><Check aria-hidden="true" />{text}</li>)}</ul>
        </div>
        <div className="fl-hero-art">
          <div className="fl-photo"><Image src="/brand/institut-beaute-soin.webp" alt="Un moment de soin du visage en institut de beauté" width={1536} height={1024} priority sizes="(max-width: 760px) 100vw, 55vw" /></div>
          <div className="fl-hero-phone"><LoyaltyCard /></div>
          <Image className="fl-spa" src="/brand/footer-spa-cutout.png" alt="" width={1774} height={887} sizes="(max-width: 760px) 40vw, 220px" />
          <span className="fl-floating-gift" aria-hidden="true"><Gift /></span>
        </div>
      </section>

      <section className="fl-wrap fl-process" aria-labelledby="fl-process-title">
        <h2 id="fl-process-title">Comment fonctionne le <em>programme de fidélité ?</em></h2>
        <ol>{steps.map((step, index) => { const Icon = step.icon; return <li key={step.title}><span className="fl-number">{index + 1}</span><Icon aria-hidden="true" /><h3>{step.title}</h3><p>{step.text}</p>{index < steps.length - 1 && <ArrowRight className="fl-step-arrow" aria-hidden="true" />}</li>; })}</ol>
      </section>

      <div className="fl-wrap fl-main-grid">
        <section className="fl-digital" aria-labelledby="fl-digital-title">
          <h2 id="fl-digital-title">La carte de fidélité <em>digitale</em></h2>
          <div className="fl-digital-content"><LoyaltyCard compact /><ul>{["Une carte accessible sur le téléphone", "Un QR code propre à chaque carte", "Une progression visible par la cliente", "Des récompenses définies par l’institut"].map(text => <li key={text}><CheckCircle2 aria-hidden="true" />{text}</li>)}</ul></div>
        </section>
        <section className="fl-benefits" aria-labelledby="fl-benefits-title">
          <h2 id="fl-benefits-title">Les avantages <em>pour votre institut</em></h2>
          <div className="fl-benefit-grid">{benefits.map(item => { const Icon = item.icon; return <article key={item.title}><Icon aria-hidden="true" /><h3>{item.title}</h3><p>{item.text}</p></article>; })}</div>
        </section>
      </div>

      <div className="fl-wrap">
        <section className="fl-wallet"><div><WalletCards aria-hidden="true" /><h2>Compatible <em>Google Wallet & Apple Wallet</em></h2></div><p>Selon la configuration de votre institut, vos clientes peuvent ajouter leur carte à leur portefeuille mobile pour la retrouver facilement.</p><ul><li><Check aria-hidden="true" /> Carte à portée de main</li><li><Check aria-hidden="true" /> Progression consultable</li></ul></section>
        <div className="fl-bottom-grid">
          <section className="fl-rewards"><h2>Des récompenses <em>à votre image</em></h2><p>Exemples à adapter aux règles de votre institut.</p><div>{[{ icon: Sparkles, title: "Un soin offert" }, { icon: Gift, title: "Une remise fidélité" }, { icon: Star, title: "Une attention spéciale" }].map(item => { const Icon = item.icon; return <article key={item.title}><Icon aria-hidden="true" /><h3>{item.title}</h3></article>; })}</div></section>
          <section className="fl-cta"><Heart aria-hidden="true" /><div><h2>Activez dès aujourd’hui <em>votre programme de fidélité</em></h2><p>Gardez le lien avec vos clientes, visite après visite.</p><Link href="/professionnel/">Essai gratuit {PUBLIC_OFFER.trialDays} jours <ArrowRight aria-hidden="true" /></Link></div></section>
        </div>
        <section className="fl-details" aria-labelledby="fl-details-title"><h2 id="fl-details-title">La fidélité, <em>dans votre quotidien</em></h2><div>{sections.map(section => <details key={section.id} id={section.id}><summary>{section.title}<ChevronDown aria-hidden="true" /></summary><p>{section.text}</p>{section.id === "fiche" && <Link href="/gestion-clientes/">Découvrir les fiches clientes <ArrowRight aria-hidden="true" /></Link>}{section.id === "rendez-vous" && <Link href="/reservation-en-ligne/">Découvrir la réservation en ligne <ArrowRight aria-hidden="true" /></Link>}{section.id === "ventes" && <Link href="/caisse/">Découvrir la caisse <ArrowRight aria-hidden="true" /></Link>}</details>)}</div></section>
        <section className="fl-faq" aria-labelledby="fl-faq-title"><h2 id="fl-faq-title">Vos questions sur <em>la fidélité</em></h2>{faqs.map(faq => <details key={faq.q}><summary>{faq.q}<ChevronDown aria-hidden="true" /></summary><p>{faq.a}</p></details>)}</section>
      </div>
    </div>
  );
}
