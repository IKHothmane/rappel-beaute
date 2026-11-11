"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Award, BarChart3, CalendarDays, CheckCircle2, CreditCard, Layers, PlayCircle, Users, Package } from "lucide-react";

const modules = [
  { icon: CalendarDays, title: "Gestion des rendez-vous", heading: "Un agenda clair pour toute votre équipe", image: "/site/rappelbeauty-agenda-pc-complet-2200x1270.webp", width: 2200, height: 1270, text: "Retrouvez les rendez-vous, les praticiennes et les cabines dans un planning commun.", points: ["Consultez le jour, la semaine ou le mois", "Identifiez les disponibilités", "Retrouvez les détails de chaque prestation"], href: "/gestion-rendez-vous/" },
  { icon: Users, title: "Clientes et historique", heading: "Toutes les informations au même endroit", image: "/site/rappelbeauty-clientes-pc-reel.webp", width: 2200, height: 1230, text: "La fiche cliente réunit les coordonnées, les visites et les informations utiles au suivi.", points: ["Consultez l’historique des soins", "Retrouvez vos notes de suivi", "Gardez le lien avec vos clientes"], href: "/gestion-clientes/" },
  { icon: Layers, title: "Services et forfaits", heading: "Votre carte de soins, bien organisée", image: "", width: 1536, height: 1024, text: "Présentez vos prestations et leurs tarifs, puis retrouvez-les lors de la prise de rendez-vous.", points: ["Organisez vos services", "Définissez les durées et les prix", "Suivez les forfaits dans la fiche cliente"], href: "/fonctionnalites/#services" },
  { icon: Package, title: "Produits et stock", heading: "Un stock qui suit la vie de l’institut", image: "/site/rappelbeauty-produits-stock-pc-reel.webp", width: 2200, height: 1200, text: "Suivez les produits vendus et consommés pendant les soins, ainsi que vos achats.", points: ["Consultez les quantités disponibles", "Repérez les produits à réapprovisionner", "Retrouvez les mouvements de stock"], href: "/gestion-stock/" },
  { icon: CreditCard, title: "Caisse et paiements", heading: "Vos encaissements, en toute clarté", image: "/site/rappelbeauty-caisse-pc-reel.webp", width: 2200, height: 1250, text: "Enregistrez les règlements réalisés à l’institut et suivez votre activité quotidienne.", points: ["Retrouvez les différents moyens de paiement", "Consultez les tickets de caisse", "Suivez les dépenses et les clôtures"], href: "/caisse/" },
  { icon: Award, title: "Fidélité et récompenses", heading: "Valorisez chaque visite de vos clientes", image: "/site/rappelbeauty-fidelite-pc-reel.webp", width: 2200, height: 1250, text: "Personnalisez le programme et suivez les avantages de chaque cliente depuis sa fiche.", points: ["Définissez vos récompenses", "Consultez les soldes et mouvements", "Retrouvez la carte digitale"], href: "/fidelite/" },
  { icon: BarChart3, title: "Statistiques et performances", heading: "Vos indicateurs pour décider", image: "/site/rappelbeauty-analytics-pc-reel.webp", width: 2200, height: 1250, text: "Consultez les résultats de votre institut et prenez du recul sur son activité.", points: ["Suivez le chiffre d’affaires", "Analysez les prestations", "Comparez l’activité au fil du temps"], href: "/fonctionnalites/#analytics" },
] as const;

export function DemoExplorer() {
  const [active, setActive] = useState(0);
  const [guided, setGuided] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const item = modules[active];
  function show(index: number, guide = false) {
    setActive(index);
    setGuided(guide);
  }
  return <section className="eng-wrap dm-explorer" id="demo-interactive" aria-labelledby="dm-explorer-title">
    <h2 id="dm-explorer-title">Ce que vous allez découvrir <em>dans la démo</em></h2>
    <p className="dm-explorer-intro">Choisissez un module pour découvrir les captures du logiciel et les exemples de fonctionnement.</p>
    <div className="dm-modules" aria-label="Modules à explorer">{modules.map((module, index) => { const Icon = module.icon; return <button key={module.title} type="button" aria-pressed={active === index} aria-controls="dm-preview" onClick={() => show(index)}><Icon aria-hidden="true" /><span>{module.title}</span></button>; })}</div>
    <div className="dm-preview" id="dm-preview" ref={panel}>
      <figure>{item.image ? <Image key={item.image} src={item.image} alt={`Capture de Rappel Beauty : ${item.title}`} width={item.width} height={item.height} sizes="(max-width: 760px) 100vw, 65vw" /> : <div className="dm-services-example"><span className="eng-badge"><Layers aria-hidden="true" /> Exemple de carte de soins</span><h3>Vos prestations, au même endroit</h3>{[{ name: "Soin du visage", duration: "60 minutes" }, { name: "Manucure", duration: "30 minutes" }, { name: "Massage relaxant", duration: "45 minutes" }].map(service => <div key={service.name}><span>{service.name}</span><span>{service.duration}</span></div>)}<p>Les services, durées et tarifs sont définis par votre institut.</p></div>}<figcaption>{item.image ? "Capture de l’interface · aperçu sans modification de données" : "Exemple illustratif de prestations"}</figcaption></figure>
      <div className="dm-preview-copy"><span className="eng-badge">{guided ? `Visite guidée · ${active + 1} / ${modules.length}` : "Explorez à votre rythme"}</span><h3 aria-live="polite">{item.heading}</h3><p>{item.text}</p><ul>{item.points.map(point => <li key={point}><CheckCircle2 aria-hidden="true" />{point}</li>)}</ul><Link href={item.href} className="dm-detail-link">Découvrir ce module <ArrowRight aria-hidden="true" /></Link><div className="dm-controls"><button type="button" onClick={() => show(active - 1, true)} disabled={active === 0}><ArrowLeft aria-hidden="true" /> Précédent</button><button type="button" onClick={() => show(active + 1, true)} disabled={active === modules.length - 1}>Suivant <ArrowRight aria-hidden="true" /></button></div></div>
    </div>
    <div className="dm-guided"><div><PlayCircle aria-hidden="true" /><div><h2>Une visite guidée <em>à votre rythme</em></h2><p>De l’agenda aux statistiques, découvrez les sept modules en suivant le parcours.</p><button className="eng-button" type="button" onClick={() => { show(0, true); panel.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); }}>Commencer la visite <ArrowRight aria-hidden="true" /></button></div></div><aside><CalendarDays aria-hidden="true" /><h3>Vous préférez un accompagnement ?</h3><p>Demandez une démonstration personnalisée pour découvrir comment Rappel Beauty peut répondre aux besoins de votre institut.</p><Link href="/contact/?subject=demo#contact-form" className="eng-button">Réserver une démo guidée <ArrowRight aria-hidden="true" /></Link></aside></div>
  </section>;
}
