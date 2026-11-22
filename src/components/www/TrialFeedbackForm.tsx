"use client";

import { Star } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

const LABELS = ["Très décevant", "Décevant", "Correct", "Bien", "Excellent"];
const MAX = 1000;

export function TrialFeedbackForm({ token }: { token: string }) {
  const [rating, setRating] = useState(0);
  const [liked, setLiked] = useState("");
  const [improve, setImprove] = useState("");
  const [trap, setTrap] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const busy = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    if (rating < 1) {
      setError("Choisissez une note de 1 à 5 étoiles.");
      return;
    }
    busy.current = true;
    setStatus("sending");
    setError("");
    try {
      const response = await fetch("/api/public/trial-feedback/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, rating, liked, improve, website: trap }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Votre avis n’a pas pu être envoyé.");
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Réessayez dans un instant.");
      setStatus("idle");
    } finally {
      busy.current = false;
    }
  }

  if (status === "done") {
    return (
      <div role="status" className="tf-done">
        <p className="tf-done-title">Merci pour votre avis !</p>
        <p>Il a bien été transmis à l’équipe Rappel Beauty. Nous le lirons avec attention.</p>
      </div>
    );
  }

  return (
    <form className="tf-form" onSubmit={submit} noValidate>
      <fieldset className="tf-rating" disabled={status === "sending"}>
        <legend>Votre note globale</legend>
        <div role="radiogroup" aria-label="Note de 1 à 5">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} sur 5 : ${LABELS[value - 1]}`}
              onClick={() => setRating(value)}
              className={value <= rating ? "on" : ""}
            >
              <Star aria-hidden="true" />
            </button>
          ))}
        </div>
        <p className="tf-rating-label" aria-live="polite">{rating ? LABELS[rating - 1] : "Touchez une étoile"}</p>
      </fieldset>

      <label className="tf-field">
        Ce qui vous a plu <span>(facultatif)</span>
        <textarea rows={3} maxLength={MAX} value={liked} onChange={(e) => setLiked(e.target.value)} disabled={status === "sending"} />
      </label>
      <label className="tf-field">
        Ce que nous pouvons améliorer <span>(facultatif)</span>
        <textarea rows={3} maxLength={MAX} value={improve} onChange={(e) => setImprove(e.target.value)} disabled={status === "sending"} />
      </label>

      {/* Leurre anti-robot : invisible, jamais rempli par une personne. */}
      <div className="tf-hp" aria-hidden="true">
        <label>
          Ne pas remplir
          <input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
        </label>
      </div>

      {error ? <p role="alert" className="tf-error">{error}</p> : null}
      <button type="submit" className="tf-submit" disabled={status === "sending"}>
        {status === "sending" ? "Envoi…" : "Envoyer mon avis"}
      </button>
    </form>
  );
}
