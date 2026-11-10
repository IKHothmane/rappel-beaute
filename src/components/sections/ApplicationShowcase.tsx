"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent } from "react";
import { ChevronRight, CircleCheck, Laptop } from "lucide-react";
import { Ico, type IcoName } from "@/components/www/home/Ico";
import "./application-showcase.css";

type Tab = {
  id: string;
  icon: IcoName;
  title: string;
  short: string;
  image: string;
  imageHeight: number;
  alt: string;
  text: string;
  points: readonly string[];
};

/**
 * Une entrée = une capture réelle de /public/site.
 * Pour ajouter un onglet (ex. Équipe, Ressources), déposer la capture dans
 * /public/site puis ajouter l'entrée ici.
 */
const TABS: readonly Tab[] = [
  {
    id: "agenda",
    icon: "cal",
    title: "Agenda",
    short: "Par praticienne, cabine et statut",
    image: "/site/rappelbeauty-agenda-pc-complet-2200x1270.webp",
    imageHeight: 1270,
    alt: "Agenda de la semaine dans Rappel Beauty",
    text: "Vue jour, semaine ou mois. Filtrez par praticienne, service, cabine ou statut et repérez d’un coup d’œil les soins à confirmer.",
    points: [
      "Conflits de cabine et de machine détectés",
      "Statuts confirmé, en attente, terminé, annulé",
      "Taux d’occupation et CA prévisionnel du jour",
    ],
  },
  {
    id: "clientes",
    icon: "users",
    title: "Clientes",
    short: "Fiches, historique et relances",
    image: "/site/rappelbeauty-clientes-pc-reel.webp",
    imageHeight: 1230,
    alt: "Fiches clientes dans Rappel Beauty",
    text: "Historique des soins, notes et fidélité : retrouvez tout ce qui concerne une cliente en un seul endroit.",
    points: [
      "Fiche complète et historique des soins",
      "Segments clientes VIP et clientes inactives",
      "Relances WhatsApp préparées",
    ],
  },
  {
    id: "caisse",
    icon: "cash",
    title: "Caisse & paiements",
    short: "Encaissements et clôture du soir",
    image: "/site/rappelbeauty-caisse-pc-reel.webp",
    imageHeight: 1250,
    alt: "Caisse et paiements dans Rappel Beauty",
    text: "Encaissez en espèces, carte ou virement, suivez les dépenses et clôturez la caisse chaque soir.",
    points: [
      "Espèces, carte et virement",
      "Clôture de caisse quotidienne",
      "Dépenses et rapports en MAD",
    ],
  },
  {
    id: "stock",
    icon: "box",
    title: "Produits & stock",
    short: "Seuils, ruptures et marges",
    image: "/site/rappelbeauty-produits-stock-pc-reel.webp",
    imageHeight: 1200,
    alt: "Écran Produits & Stock dans Rappel Beauty",
    text: "Produits de vente et consommables cabine suivis séparément, avec la valeur du stock et la marge par article.",
    points: [
      "Alertes sous le seuil et ruptures",
      "Dates d’expiration à surveiller",
      "Entrées, sorties et commandes",
    ],
  },
  {
    id: "fidelite",
    icon: "gift",
    title: "Fidélité",
    short: "Carte QR et récompenses",
    image: "/site/rappelbeauty-fidelite-pc-reel.webp",
    imageHeight: 1250,
    alt: "Écran Programme de fidélité dans Rappel Beauty",
    text: "Un QR code permanent pour votre institut. Vos clientes cumulent leurs passages et débloquent une récompense.",
    points: [
      "Scan avec la caméra de la tablette",
      "Objectif, récompense et validité réglables",
      "Page cliente sans application",
    ],
  },
];

export default function ApplicationShowcase() {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = TABS[active];

  function select(index: number, focus = false) {
    setActive(index);
    if (focus) tabRefs.current[index]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? -1
          : 0;
    if (event.key === "Home") {
      event.preventDefault();
      select(0, true);
    } else if (event.key === "End") {
      event.preventDefault();
      select(TABS.length - 1, true);
    } else if (step) {
      event.preventDefault();
      select((index + step + TABS.length) % TABS.length, true);
    }
  }

  const benefits = current.id === "agenda" ? [
    { title: "Vue jour, semaine ou mois", text: "Filtrez par praticienne, service, cabine ou statut" },
    { title: "Conflits détectés", text: "De cabine et de machine" },
    { title: "Statuts en temps réel", text: "Confirmé, en attente, terminé, annulé" },
    { title: "Suivi des performances", text: "Taux d’occupation et CA prévisionnel" },
  ] : [
    { title: current.title, text: current.short },
    ...current.points.map((title) => ({ title, text: "" })),
  ];

  return (
    <section id="produit" className="application-showcase" aria-labelledby="application-heading">
      <div className="application-showcase-inner">
        <div className="application-showcase-grid">
          <div className="application-showcase-copy">
            <span className="application-showcase-badge"><Laptop size={19} aria-hidden="true" /> L’application</span>
            <h2 id="application-heading">Tout votre institut,<br /><span>sur un seul écran</span></h2>
            <p className="application-showcase-intro">
              Chaque module communique avec les autres. Un soin terminé alimente la caisse,
              décompte le stock cabine et ajoute un passage sur la carte fidélité.
            </p>
            <div className="application-showcase-tabs" role="tablist" aria-label="Modules de l’application" aria-orientation="vertical">
              {TABS.map((tab, index) => {
                const selected = index === active;
                return (
                  <button key={tab.id} ref={(node) => { tabRefs.current[index] = node; }}
                    type="button" className="application-showcase-tab" role="tab"
                    id={`application-tab-${tab.id}`} aria-selected={selected}
                    aria-controls="application-panel" tabIndex={selected ? 0 : -1}
                    onClick={() => select(index)} onKeyDown={(event) => onKeyDown(event, index)}>
                    <span className="application-showcase-icon"><Ico name={tab.icon} /></span>
                    <span className="application-showcase-tab-label"><b>{tab.title}</b><span>{tab.short}</span></span>
                    {selected && <ChevronRight size={20} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="application-showcase-preview" id="application-panel" role="tabpanel"
            aria-labelledby={`application-tab-${current.id}`} tabIndex={0}>
            <div className="application-showcase-images">
              {TABS.map((tab, index) => (
                <Image key={tab.id} src={tab.image} alt={index === active ? tab.alt : ""}
                  aria-hidden={index === active ? undefined : true}
                  width={2200} height={tab.imageHeight} unoptimized
                  sizes="(max-width: 900px) 100vw, 65vw"
                  className={index === active ? "is-active" : undefined} />
              ))}
            </div>
            <p className="sr-only">{current.text}</p>
          </div>
        </div>
        <ul className="application-showcase-benefits" aria-label={`Points forts : ${current.title}`}>
          {benefits.map((benefit) => (
            <li key={benefit.title}><CircleCheck size={25} aria-hidden="true" />
              <span><b>{benefit.title}</b>{benefit.text && <span>{benefit.text}</span>}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
