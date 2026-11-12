"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Crown,
  ExternalLink,
  Layers,
  Mail,
  Monitor,
  ShoppingCart,
  Star,
  X,
} from "lucide-react";
import { WebsitePreview, type WebsiteVariant } from "./WebsitePreview";
import { websiteQuoteHref } from "./website-quote";
import { SITE } from "@/lib/site";
import { PHONE_MAX_DIGITS, limitPhoneDigits } from "@/lib/validation/customer";

const OFFERS: {
  id: WebsiteVariant;
  icon: typeof Monitor;
  title: string;
  description: string;
  features: string[];
  badge?: string;
}[] = [
  {
    id: "vitrine",
    icon: Monitor,
    title: "Site vitrine",
    description: "Présentez votre institut, vos soins, vos tarifs et vos coordonnées.",
    features: [
      "Page d’accueil à votre image",
      "Services et tarifs",
      "Galerie de votre institut",
      "Contact et localisation",
    ],
  },
  {
    id: "rendez-vous",
    icon: CalendarDays,
    title: "Site avec prise de rendez-vous",
    description: "Une vitrine avec réservation en ligne, reliée à votre agenda Rappel Beauty.",
    badge: "Populaire",
    features: [
      "Tout du site vitrine",
      "Réservation en ligne 24h/24",
      "Créneaux issus de votre planning",
      "Messages WhatsApp préparés",
    ],
  },
  {
    id: "boutique",
    icon: ShoppingCart,
    title: "Site e-commerce + RDV",
    description: "Présentez vos produits et permettez la réservation de vos soins.",
    features: [
      "Tout du site avec RDV",
      "Catalogue de produits",
      "Demandes et retrait à l’institut",
      "Connexion aux stocks selon le projet",
    ],
  },
  {
    id: "complet",
    icon: Layers,
    title: "Site complet",
    description:
      "Réunissez votre présentation, vos soins, vos produits et vos avis dans une même vitrine.",
    badge: "Recommandé",
    features: [
      "Présentation complète de l’institut",
      "Réservation en ligne",
      "Catalogue de produits",
      "Avis clients selon les sources disponibles",
      "Connexions à Rappel Beauty définies ensemble",
    ],
  },
];

export function WebsiteCreationCatalog({ children }: { children: ReactNode }) {
  const [example, setExample] = useState<WebsiteVariant | null>(null);
  const [project, setProject] = useState<WebsiteVariant | "a-definir">("a-definir");
  const [draftReady, setDraftReady] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const projectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!example || !dialog) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [example]);

  function chooseProject(id: WebsiteVariant) {
    dialogRef.current?.close();
    setProject(id);
    setExample(null);
    document.getElementById("devis")?.scrollIntoView({ behavior: "smooth", block: "start" });
    projectRef.current?.focus({ preventScroll: true });
  }
  function prepareQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const label =
      OFFERS.find((offer) => offer.id === project)?.title ?? "Projet à définir ensemble";
    window.location.href = websiteQuoteHref(SITE.email, {
      project: label,
      name: String(fields.get("name") ?? ""),
      institute: String(fields.get("institute") ?? ""),
      email: String(fields.get("email") ?? ""),
      phone: String(fields.get("phone") ?? ""),
      message: String(fields.get("message") ?? ""),
    });
    setDraftReady(true);
  }
  const current = OFFERS.find((offer) => offer.id === example);

  return (
    <>
      <section id="types-de-sites" className="cw-offers" aria-labelledby="cw-offers-title">
        <div className="cw-section-heading">
          <h2 id="cw-offers-title">
            Choisissez le <em>type de site</em> adapté à votre activité
          </h2>
          <p>
            Du site vitrine au projet complet : une présence en ligne pensée pour votre institut.
          </p>
        </div>
        <div className="cw-offer-grid">
          {OFFERS.map(({ id, icon: Icon, title, description, features, badge }) => (
            <article className={`cw-offer cw-offer-${id}`} key={id}>
              {badge && (
                <span className="cw-offer-badge">
                  {id === "complet" ? <Crown aria-hidden="true" /> : <Star aria-hidden="true" />}
                  {badge}
                </span>
              )}
              <button
                className="cw-preview-trigger"
                type="button"
                onClick={() => setExample(id)}
                aria-label={`Voir un exemple : ${title}`}
              >
                <WebsitePreview variant={id} />
              </button>
              <div className="cw-offer-title">
                <Icon aria-hidden="true" />
                <h3>{title}</h3>
              </div>
              <p>{description}</p>
              <ul>
                {features.map((feature) => (
                  <li key={feature}>
                    <Check aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button className="cw-example-button" type="button" onClick={() => setExample(id)}>
                Voir un exemple
                <ExternalLink aria-hidden="true" />
              </button>
              <button className="cw-choose-button" type="button" onClick={() => chooseProject(id)}>
                Choisir ce projet
                <ArrowRight aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
        <p className="cw-offer-note">
          Les aperçus sont des maquettes illustratives. Le paiement en ligne, l’hébergement, la
          maintenance et les connexions sont précisés dans votre devis.
        </p>
      </section>
      {children}
      <section id="devis" className="cw-quote" aria-labelledby="cw-quote-title">
        <div>
          <span className="cw-badge">
            <Mail aria-hidden="true" />
            Parlons de votre projet
          </span>
          <h2 id="cw-quote-title">
            Le site de votre institut <em>commence ici</em>
          </h2>
          <p>
            Décrivez vos envies et le type de site souhaité. Nous pourrons cadrer ensemble le
            design, les fonctionnalités et les connexions utiles.
          </p>
          <p className="cw-quote-help">
            Ce formulaire prépare un e-mail dans votre application de messagerie. Vous pourrez le
            relire avant de l’envoyer.
          </p>
        </div>
        <form onSubmit={prepareQuote} className="cw-quote-form">
          <div className="cw-form-row">
            <label>
              Votre nom
              <input name="name" autoComplete="name" minLength={2} maxLength={80} required />
            </label>
            <label>
              Nom de l’institut
              <input
                name="institute"
                autoComplete="organization"
                minLength={2}
                maxLength={80}
                required
              />
            </label>
          </div>
          <div className="cw-form-row">
            <label>
              E-mail
              <input name="email" type="email" autoComplete="email" maxLength={120} required />
            </label>
            <label>
              Téléphone (facultatif)
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                maxLength={PHONE_MAX_DIGITS}
                onChange={(event) => {
                  event.target.value = limitPhoneDigits(event.target.value);
                }}
              />
            </label>
          </div>
          <label>
            Type de site
            <select
              name="project"
              ref={projectRef}
              value={project}
              onChange={(event) => setProject(event.target.value as typeof project)}
            >
              <option value="a-definir">À définir ensemble</option>
              {OFFERS.map((offer) => (
                <option key={offer.id} value={offer.id}>
                  {offer.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Votre projet
            <textarea
              name="message"
              rows={4}
              maxLength={2000}
              placeholder="Votre activité, le style souhaité, les fonctions importantes…"
              required
            />
          </label>
          <button className="cw-primary" type="submit">
            Préparer ma demande de devis
            <ArrowRight aria-hidden="true" />
          </button>
          {draftReady && (
            <p className="cw-draft-status" role="status">
              Votre application de messagerie est sollicitée pour écrire à {SITE.email}. La demande
              sera envoyée lorsque vous la validerez dans cette application.
            </p>
          )}
        </form>
      </section>
      <dialog
        ref={dialogRef}
        className="cw-example-dialog"
        aria-labelledby="cw-example-title"
        onCancel={() => setExample(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setExample(null);
        }}
      >
        {current && (
          <div className="cw-dialog-content">
            <button
              type="button"
              className="cw-dialog-close"
              aria-label="Fermer l’exemple"
              onClick={() => setExample(null)}
            >
              <X aria-hidden="true" />
            </button>
            <span className="cw-badge">Maquette illustrative</span>
            <h2 id="cw-example-title">{current.title}</h2>
            <p>
              Un aperçu pour vous projeter. Le design et le contenu seront adaptés à votre institut.
            </p>
            <WebsitePreview variant={current.id} />
            <button className="cw-primary" type="button" onClick={() => chooseProject(current.id)}>
              Demander ce type de site
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
