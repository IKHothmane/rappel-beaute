"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Crown,
  Layers,
  Mail,
  Monitor,
  ShoppingCart,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { WebsitePreview, type WebsiteVariant } from "./WebsitePreview";
import { WEBSITE_OFFERS } from "./offers";
import { SITE } from "@/lib/site";
import { limitPhoneDigits } from "@/lib/validation/customer";

const OFFERS = WEBSITE_OFFERS;

type ProjectValue = WebsiteVariant | "a-definir";
type QuoteStatus = "idle" | "sending" | "success" | "error";

const QUOTE_ENDPOINT = "/api/public/website-quote";
const QUOTE_FALLBACK_ERROR = `Impossible d’envoyer votre demande. Réessayez ou écrivez-nous à ${SITE.email}.`;

const PROJECT_OPTIONS: {
  id: ProjectValue;
  icon: typeof Monitor;
  title: string;
  description: string;
}[] = [
  {
    id: "a-definir",
    icon: Sparkles,
    title: "À définir ensemble",
    description: "On cadre votre projet ensemble",
  },
  ...OFFERS.map(({ id, icon, title, description }) => ({ id, icon, title, description })),
];

function ProjectSelect({
  value,
  onChange,
  triggerRef,
}: {
  value: ProjectValue;
  onChange: (value: ProjectValue) => void;
  triggerRef: RefObject<HTMLButtonElement>;
}) {
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const triggerId = `${baseId}-trigger`;
  const listId = `${baseId}-list`;
  const optionId = (index: number) => `${baseId}-option-${index}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    PROJECT_OPTIONS.findIndex((option) => option.id === value),
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selected = PROJECT_OPTIONS[selectedIndex];
  const SelectedIcon = selected.icon;
  const last = PROJECT_OPTIONS.length - 1;

  useEffect(() => {
    if (!open) return;
    function closeOnOutsidePress(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(`${baseId}-option-${activeIndex}`)?.scrollIntoView({
      block: "nearest",
    });
  }, [open, activeIndex, baseId]);

  function openList(index = selectedIndex) {
    setActiveIndex(index);
    setOpen(true);
  }
  function choose(index: number) {
    onChange(PROJECT_OPTIONS[index].id);
    setOpen(false);
  }
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key;
    if (!open) {
      if (key === "Enter" || key === " " || key === "ArrowDown" || key === "ArrowUp") {
        event.preventDefault();
        openList();
      } else if (key === "Home" || key === "End") {
        event.preventDefault();
        openList(key === "Home" ? 0 : last);
      }
      return;
    }
    switch (key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, last));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(last);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <div className="cw-select-field" ref={rootRef}>
      <label id={labelId} htmlFor={triggerId}>
        Type de site
      </label>
      <input type="hidden" name="project" value={value} />
      <div className="cw-select">
        <button
          ref={triggerRef}
          id={triggerId}
          type="button"
          role="combobox"
          className="cw-select-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={labelId}
          aria-activedescendant={open ? optionId(activeIndex) : undefined}
          onClick={() => (open ? setOpen(false) : openList())}
          onKeyDown={onKeyDown}
          onKeyUp={(event) => {
            // Firefox déclenche un clic au relâchement d’Espace, déjà traité au keydown.
            if (event.key === " ") event.preventDefault();
          }}
        >
          <SelectedIcon aria-hidden="true" />
          <span className="cw-select-value">{selected.title}</span>
          <ChevronDown className="cw-select-chevron" aria-hidden="true" />
        </button>
        <div
          id={listId}
          role="listbox"
          aria-labelledby={labelId}
          className="cw-select-panel"
          hidden={!open}
        >
          {PROJECT_OPTIONS.map(({ id, icon: Icon, title, description }, index) => (
            <div
              key={id}
              id={optionId(index)}
              role="option"
              aria-selected={id === value}
              className="cw-select-option"
              data-active={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onMouseMove={() => index !== activeIndex && setActiveIndex(index)}
              onClick={() => {
                choose(index);
                triggerRef.current?.focus({ preventScroll: true });
              }}
            >
              <span className="cw-select-icon">
                <Icon aria-hidden="true" />
              </span>
              <span className="cw-select-text">
                <span className="cw-select-title">{title}</span>
                <span className="cw-select-desc">{description}</span>
              </span>
              <Check className="cw-select-check" aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WebsiteCreationCatalog({ children }: { children: ReactNode }) {
  const [example, setExample] = useState<WebsiteVariant | null>(null);
  const [project, setProject] = useState<ProjectValue>("a-definir");
  const [quoteStatus, setQuoteStatus] = useState<QuoteStatus>("idle");
  const [quoteError, setQuoteError] = useState("");
  const sendingRef = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const projectRef = useRef<HTMLButtonElement>(null);

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
  async function sendQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendingRef.current) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const label =
      OFFERS.find((offer) => offer.id === project)?.title ?? "Projet à définir ensemble";
    const phone = String(fields.get("phone") ?? "").trim();
    sendingRef.current = true;
    setQuoteStatus("sending");
    setQuoteError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(QUOTE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          name: String(fields.get("name") ?? "").trim(),
          institute: String(fields.get("institute") ?? "").trim(),
          email: String(fields.get("email") ?? "").trim(),
          phone,
          project: label,
          message: String(fields.get("message") ?? "").trim(),
          website: String(fields.get("website") ?? ""),
        }),
      });
      if (response.ok) {
        form.reset();
        setProject("a-definir");
        setQuoteStatus("success");
        return;
      }
      const data: { error?: unknown } | null = await response.json().catch(() => null);
      setQuoteError(
        typeof data?.error === "string" && data.error.trim() ? data.error : QUOTE_FALLBACK_ERROR,
      );
      setQuoteStatus("error");
    } catch {
      setQuoteError(QUOTE_FALLBACK_ERROR);
      setQuoteStatus("error");
    } finally {
      window.clearTimeout(timeout);
      sendingRef.current = false;
    }
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
          <p className="cw-quote-help">Nous vous répondons à l’adresse e-mail indiquée.</p>
        </div>
        <form onSubmit={sendQuote} className="cw-quote-form" aria-busy={quoteStatus === "sending"}>
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
              Téléphone
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                minLength={8}
                maxLength={20}
                required
                onChange={(event) => {
                  event.target.value = limitPhoneDigits(event.target.value);
                }}
              />
            </label>
          </div>
          <ProjectSelect value={project} onChange={setProject} triggerRef={projectRef} />
          <label>
            Votre projet (facultatif)
            <textarea
              name="message"
              rows={4}
              maxLength={1000}
              placeholder="Votre activité, le style souhaité, les fonctions importantes…"
            />
          </label>
          <div className="cw-hp" aria-hidden="true">
            <label>
              Ne pas remplir ce champ
              <input name="website" type="text" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <button
            className="cw-primary"
            type="submit"
            disabled={quoteStatus === "sending"}
            aria-busy={quoteStatus === "sending"}
          >
            {quoteStatus === "sending" ? "Envoi en cours…" : "Envoyer ma demande de devis"}
            {quoteStatus !== "sending" && <ArrowRight aria-hidden="true" />}
          </button>
          <div className="cw-form-feedback">
            {quoteStatus === "success" && (
              <p className="cw-form-message cw-form-success" role="status">
                Merci, votre demande est bien envoyée. Nous vous répondons par e-mail rapidement.
              </p>
            )}
            {quoteStatus === "error" && (
              <p className="cw-form-message cw-form-error" role="alert">
                {quoteError}
              </p>
            )}
          </div>
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
