import Image from "next/image";
import { ArrowUpRight, BarChart3, CreditCard, Wallet } from "lucide-react";
import "./pilotage-section.css";

const FEATURES = [
  {
    icon: BarChart3,
    title: "Chiffre d’affaires jour par jour",
    description: "Repérez vos jours forts et vos creux.",
  },
  {
    icon: Wallet,
    title: "Bénéfice net réel",
    description: "Dépenses déduites, sans tableur à tenir.",
  },
  {
    icon: CreditCard,
    title: "Modes de paiement",
    description: "Suivez les espèces, cartes et virements.",
  },
] as const;

export default function PilotageSection() {
  return (
    <section id="pilotage" className="pilotage-section" aria-labelledby="pilotage-heading">
      <div className="pilotage-container">
        <div className="pilotage-heading">
          <span className="pilotage-eyebrow"><span aria-hidden="true" />Pilotage</span>
          <h2 id="pilotage-heading">
            Sachez exactement<br />où en est <em>votre institut.</em>
          </h2>
          <p>
            Le score de santé de l’établissement, le chiffre d’affaires et la caisse du jour
            au même endroit. Vous voyez ce qui fonctionne et ce qui coûte, mois après mois.
          </p>
        </div>

        <figure className="pilotage-preview">
          <div className="pilotage-frame">
            <Image
              src="/marketing/dashboard-pilotage.webp"
              alt="Tableau de bord réel de Rappel Beauty : actions du jour, analyse financière et caisse"
              width={1640}
              height={545}
              sizes="(max-width: 1279px) 100vw, 1184px"
              className="pilotage-dashboard"
            />
          </div>
          <figcaption className="pilotage-caption">
            <span><ArrowUpRight size={18} aria-hidden="true" /></span>
            Vos indicateurs en un coup d’œil
          </figcaption>
        </figure>

        <div className="pilotage-features">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="pilotage-feature">
              <span className="pilotage-feature-icon"><Icon size={22} aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
