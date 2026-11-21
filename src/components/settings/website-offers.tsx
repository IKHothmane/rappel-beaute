"use client";

import { ArrowRight, Check, CheckCircle2, Crown, Star } from "lucide-react";
import { useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { WEBSITE_OFFERS } from "@/components/website-creation/offers";
import { WebsitePreview, type WebsiteVariant } from "@/components/website-creation/WebsitePreview";
import "./website-offers.css";

/**
 * Types de site, en tête de la carte Abonnement. « Choisir ce projet » envoie la demande directement par
 * e-mail : le serveur utilise les coordonnées du compte et de l'institut, aucun formulaire à remplir.
 */
export function WebsiteOffersSection({ canRequest }: { canRequest: boolean }) {
  const { toast } = useToast();
  const [sending, setSending] = useState<WebsiteVariant | null>(null);
  const [sent, setSent] = useState<Set<WebsiteVariant>>(new Set());
  const inFlight = useRef(false);

  async function choose(id: WebsiteVariant) {
    if (inFlight.current || sent.has(id)) return;
    inFlight.current = true;
    setSending(id);
    try {
      const res = await fetch("/api/website-quote/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: id }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; alreadySent?: boolean };
      if (!res.ok) {
        toast(data.error || "Votre demande n'a pas pu être envoyée.", "error");
        return;
      }
      setSent((prev) => new Set(prev).add(id));
      toast(
        data.alreadySent
          ? "Cette demande a déjà été envoyée. Nous vous répondons par e-mail."
          : "Demande envoyée. Nous vous répondons par e-mail avec votre devis.",
        "success",
      );
    } catch {
      toast("Réseau indisponible. Réessayez.", "error");
    } finally {
      inFlight.current = false;
      setSending(null);
    }
  }

  return (
    <section aria-labelledby="settings-website-title">
      <div className="swo-head">
        <h3 id="settings-website-title">
          Choisissez le <em>type de site</em> adapté à votre activité
        </h3>
        <p>Du site vitrine au projet complet : une présence en ligne pensée pour votre institut.</p>
      </div>
      <div className="swo-grid">
        {WEBSITE_OFFERS.map(({ id, icon: Icon, title, description, features, badge }) => {
          const done = sent.has(id);
          return (
            <article className={`swo-card swo-card-${id}`} key={id}>
              {badge ? (
                <span className="swo-badge">
                  {id === "complet" ? <Crown aria-hidden="true" /> : <Star aria-hidden="true" />}
                  {badge}
                </span>
              ) : null}
              <div className="swo-preview">
                <WebsitePreview variant={id} />
              </div>
              <div className="swo-title">
                <Icon aria-hidden="true" />
                <h4>{title}</h4>
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
              <button
                type="button"
                className="swo-choose"
                data-sent={done}
                disabled={!canRequest || sending !== null || done}
                aria-busy={sending === id}
                onClick={() => void choose(id)}
              >
                {done ? (
                  <>
                    <CheckCircle2 aria-hidden="true" />
                    Demande envoyée
                  </>
                ) : sending === id ? (
                  "Envoi…"
                ) : (
                  <>
                    Choisir ce projet
                    <ArrowRight aria-hidden="true" />
                  </>
                )}
              </button>
            </article>
          );
        })}
      </div>
      <p className="swo-note">
        {canRequest
          ? "Un clic suffit : nous utilisons les informations de votre institut (nom, e-mail, téléphone) et vous répondons par e-mail. "
          : "Seul le propriétaire de l’institut peut envoyer une demande. "}
        Les aperçus sont des maquettes illustratives. Le paiement en ligne, l’hébergement, la maintenance et les
        connexions sont précisés dans votre devis.
      </p>
    </section>
  );
}
