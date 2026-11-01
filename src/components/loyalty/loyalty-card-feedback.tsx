"use client";

import { useState, type FormEvent } from "react";
import { Star } from "lucide-react";

export function LoyaltyCardFeedback({
  token,
  organizationName,
  firstName,
  lastName,
  phone,
  onSaved,
}: {
  token: string;
  organizationName: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  onSaved?: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/public/loyalty-card/feedback/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          firstName,
          lastName,
          phone: phone && !phone.startsWith("WL") ? phone : "",
          rating,
          comment,
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error || "Envoi impossible.");
      setDone(true);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <section className="rounded-2xl border border-[#F0DDE7] bg-white p-4 sm:p-5">
        <p className="text-center text-sm text-[#806B77]">
          Merci {firstName}. Votre avis est enregistré et sera lu par {organizationName}.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#F0DDE7] bg-white p-4 sm:p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9A5273]">Votre avis</p>
      <h2 className="mt-1 text-lg font-extrabold text-[#43293A]">Votre avis compte</h2>
      <p className="mt-1 text-sm text-[#806B77]">
        Laissez un avis pour {organizationName}. Le commentaire est facultatif.
      </p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-[#43293A]">Votre note</p>
          <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Note">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={rating === star}
                onClick={() => setRating(star)}
                className="flex h-11 w-11 items-center justify-center rounded-full"
                aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
              >
                <Star
                  size={32}
                  strokeWidth={1.5}
                  className={rating >= star ? "fill-[#E8B23A] text-[#E8B23A]" : "fill-transparent text-[#D9BFCB]"}
                />
              </button>
            ))}
          </div>
        </div>
        <label className="block text-sm font-semibold text-[#43293A]">
          Commentaire (facultatif)
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={800}
            rows={4}
            placeholder="Comment s’est passé votre passage ?"
            className="mt-1 w-full rounded-xl border border-[#F0DDE7] px-3 py-2 text-sm font-normal outline-none focus:border-[#A83E70]"
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="h-11 w-full rounded-xl bg-[#A83E70] text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Envoi…" : "Envoyer mon avis"}
        </button>
      </form>
    </section>
  );
}
