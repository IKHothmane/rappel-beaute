"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  CreditCard,
  Headphones,
  LayoutGrid,
  MessageCircle,
  MessagesSquare,
  Monitor,
  MoreHorizontal,
  Package,
  Search,
  ShieldCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { FAQ_ITEMS, PUBLIC_OFFER, SITE, type FaqCategory } from "@/lib/site";

const CATEGORIES = [
  { id: "all", icon: LayoutGrid, title: "Toutes", subtitle: "les questions" },
  { id: "agenda", icon: CalendarDays, title: "Rendez-vous", subtitle: "et agenda" },
  { id: "clientes", icon: Users, title: "Clientes", subtitle: "et fidélité" },
  { id: "produits", icon: Package, title: "Produits", subtitle: "et stock" },
  { id: "site", icon: Monitor, title: "Réservation", subtitle: "en ligne" },
  { id: "tarifs", icon: CreditCard, title: "Tarifs", subtitle: "et abonnement" },
  { id: "securite", icon: ShieldCheck, title: "Sécurité", subtitle: "et données" },
  { id: "support", icon: Headphones, title: "Assistance", subtitle: "et support" },
] as const;
const QUESTION_ICONS = {
  general: MessagesSquare,
  agenda: CalendarDays,
  clientes: Users,
  produits: Package,
  site: Monitor,
  tarifs: CreditCard,
  securite: ShieldCheck,
  support: Headphones,
};
const HERO_TOPICS = [
  { icon: CalendarDays, text: "Rendez-vous" },
  { icon: Monitor, text: "Réservation" },
  { icon: Package, text: "Produits" },
  { icon: Users, text: "Clientes" },
  { icon: ChartNoAxesCombined, text: "Pilotage" },
  { icon: MoreHorizontal, text: "Et plus" },
];
function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/œ/g, "oe")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function FaqExplorer() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | FaqCategory>("all");
  const [openId, setOpenId] = useState<string | null>("presentation");
  const [showAll, setShowAll] = useState(false);
  const terms = normalize(search).split(" ").filter(Boolean);
  const matches = FAQ_ITEMS.filter(
    (item) =>
      (category === "all" || item.category === category) &&
      terms.every((term) => normalize(`${item.q} ${item.a}`).includes(term)),
  );
  const isOverview = category === "all" && terms.length === 0;
  const visible = isOverview && !showAll ? matches.slice(0, 9) : matches;
  const categoryLabel = CATEGORIES.find((item) => item.id === category);
  function reset() {
    setSearch("");
    setCategory("all");
    setShowAll(false);
    setOpenId("presentation");
  }
  function focusResults() {
    document.getElementById("faq-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("faq-results-title")?.focus({ preventScroll: true });
  }

  return (
    <div className="fq">
      <div className="vt-wrap fq-wrap">
        <section className="fq-hero" aria-labelledby="faq-title">
          <div className="fq-hero-copy">
            <span className="vt-badge fq-badge">
              <MessagesSquare aria-hidden="true" />
              FAQ — Questions fréquentes
            </span>
            <h1 id="faq-title">
              Vos questions,
              <br />
              <em>nos réponses</em>
            </h1>
            <p className="fq-lead">
              Retrouvez ici les réponses aux questions les plus fréquentes sur Rappel Beauty, ses
              fonctionnalités, ses tarifs et la réservation en ligne.
            </p>
            <form
              className="fq-search"
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                focusResults();
              }}
            >
              <label htmlFor="faq-search" className="sr-only">
                Rechercher une question dans la FAQ
              </label>
              <Search aria-hidden="true" />
              <input
                id="faq-search"
                type="search"
                placeholder="Rechercher une question…"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setShowAll(false);
                }}
                autoComplete="off"
                aria-controls="faq-results"
              />
              {search && (
                <button
                  type="button"
                  aria-label="Effacer la recherche"
                  onClick={() => setSearch("")}
                >
                  <X aria-hidden="true" />
                </button>
              )}
            </form>
          </div>
          <div className="fq-hero-art">
            <div className="fq-photo-frame">
              <Image
                src="/brand/about-professional.webp"
                alt="Illustration d’une professionnelle de la beauté utilisant une tablette"
                width={1448}
                height={1086}
                sizes="(max-width: 760px) 100vw, 58vw"
                priority
              />
            </div>
            <div className="fq-hero-topics" aria-hidden="true">
              {HERO_TOPICS.map(({ icon: Icon, text }) => (
                <div key={text}>
                  <Icon />
                  <span>{text}</span>
                </div>
              ))}
            </div>
            <Image
              className="fq-hero-spa"
              src="/brand/footer-spa-cutout.webp"
              alt=""
              width={1774}
              height={887}
              sizes="(max-width: 760px) 120px, 220px"
            />
          </div>
        </section>

        <nav className="fq-categories" aria-label="Catégories de la FAQ">
          {CATEGORIES.map(({ id, icon: Icon, title, subtitle }) => (
            <button
              key={id}
              type="button"
              aria-pressed={category === id}
              onClick={() => {
                setCategory(id);
                setShowAll(false);
                setOpenId(null);
              }}
            >
              <Icon aria-hidden="true" />
              <span>
                {title}
                <br />
                {subtitle}
              </span>
            </button>
          ))}
        </nav>

        <div className="fq-content">
          <aside className="fq-sidebar">
            <section className="fq-support" aria-labelledby="faq-support-title">
              <div className="fq-support-art">
                <Image
                  src="/brand/about-professional.webp"
                  alt=""
                  width={1448}
                  height={1086}
                  sizes="280px"
                />
                <span>
                  <Headphones aria-hidden="true" />
                </span>
              </div>
              <h2 id="faq-support-title">
                Vous ne trouvez <em>pas la réponse ?</em>
              </h2>
              <p>Notre équipe est là pour vous aider.</p>
              <Link className="fq-support-primary" href="/contact/">
                <MessagesSquare aria-hidden="true" />
                Contacter le support
              </Link>
              <a
                className="fq-support-secondary"
                href={`https://wa.me/${SITE.phoneInternational.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle aria-hidden="true" />
                Nous écrire sur WhatsApp
              </a>
            </section>
            <section className="fq-summary" aria-labelledby="faq-summary-title">
              <h2 id="faq-summary-title">
                <Zap aria-hidden="true" />
                En résumé
              </h2>
              <ul>
                {[
                  "Gestion complète de votre institut",
                  "Réservation en ligne sur votre page",
                  `${PUBLIC_OFFER.trialDays} jours d’essai, sans carte bancaire`,
                  "Support en français inclus",
                ].map((text) => (
                  <li key={text}>
                    <Check aria-hidden="true" />
                    {text}
                  </li>
                ))}
              </ul>
            </section>
          </aside>

          <section id="faq-results" className="fq-results" aria-labelledby="faq-results-title">
            <h2 id="faq-results-title" tabIndex={-1}>
              {isOverview ? (
                <>
                  Questions les plus <em>fréquentes</em>
                </>
              ) : terms.length ? (
                <>
                  Résultats de <em>votre recherche</em>
                </>
              ) : (
                <>
                  {categoryLabel?.title} <em>{categoryLabel?.subtitle}</em>
                </>
              )}
            </h2>
            <p className="fq-count" role="status" aria-live="polite">
              {visible.length === matches.length
                ? `${matches.length} réponse${matches.length > 1 ? "s" : ""}`
                : `${visible.length} questions affichées sur ${matches.length}`}{" "}
              {category !== "all" && "dans cette catégorie"}
            </p>
            <div className="fq-questions">
              {visible.map((item) => {
                const Icon = QUESTION_ICONS[item.category];
                const isOpen = openId === item.id;
                return (
                  <article key={item.id} className={`fq-question${isOpen ? " is-open" : ""}`}>
                    <h3>
                      <button
                        id={`faq-question-${item.id}`}
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`faq-answer-${item.id}`}
                        onClick={() => setOpenId(isOpen ? null : item.id)}
                      >
                        <Icon aria-hidden="true" />
                        <span>{item.q}</span>
                        <ChevronDown aria-hidden="true" />
                      </button>
                    </h3>
                    <div
                      id={`faq-answer-${item.id}`}
                      className="fq-answer"
                      role="region"
                      aria-labelledby={`faq-question-${item.id}`}
                      hidden={!isOpen}
                    >
                      <p>{item.a}</p>
                      {"href" in item && (
                        <Link href={item.href}>
                          {item.linkLabel}
                          <ArrowRight aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            {isOverview && !showAll && matches.length > visible.length && (
              <button className="fq-show-all" type="button" onClick={() => setShowAll(true)}>
                Voir toutes les questions ({matches.length})<ArrowRight aria-hidden="true" />
              </button>
            )}
            {matches.length === 0 && (
              <div className="fq-empty">
                <Search aria-hidden="true" />
                <h3>Aucune réponse trouvée</h3>
                <p>
                  Essayez un autre mot-clé ou affichez toutes les catégories. Notre équipe peut
                  aussi vous aider.
                </p>
                <button type="button" onClick={reset}>
                  Réinitialiser la recherche
                </button>
                <Link href="/contact/">
                  Contacter notre équipe
                  <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
