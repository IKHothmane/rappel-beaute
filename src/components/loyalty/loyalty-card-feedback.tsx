"use client";

import { useState, type FormEvent } from "react";
import { limitPhoneDigits } from "@/lib/validation/customer";

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
  const knownPhone = phone && !phone.startsWith("WL") ? limitPhoneDigits(phone) : "";
  const [givenName, setGivenName] = useState(firstName);
  const [familyName, setFamilyName] = useState(lastName);
  const [mobile, setMobile] = useState(knownPhone);
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
          firstName: givenName,
          lastName: familyName,
          phone: mobile,
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
          Merci {givenName}. Votre avis est enregistré et sera lu par {organizationName}.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#F0DDE7] bg-white p-4 sm:p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9A5273]">Votre avis</p>
      <h2 className="mt-1 text-lg font-extrabold text-[#43293A]">Votre passage et vos coordonnées</h2>
      <p className="mt-1 text-sm text-[#806B77]">
        Indiquez votre nom et votre téléphone, puis laissez un avis pour {organizationName}.
      </p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <label className="block text-sm font-semibold text-[#43293A]">
          Prénom
          <input
            value={givenName}
            onChange={(event) => setGivenName(event.target.value)}
            required
            maxLength={80}
            autoComplete="given-name"
            className="mt-1 h-11 w-full rounded-xl border border-[#F0DDE7] px-3 text-sm font-normal outline-none focus:border-[#A83E70]"
          />
        </label>
        <label className="block text-sm font-semibold text-[#43293A]">
          Nom
          <input
            value={familyName}
            onChange={(event) => setFamilyName(event.target.value)}
            required
            maxLength={80}
            autoComplete="family-name"
            className="mt-1 h-11 w-full rounded-xl border border-[#F0DDE7] px-3 text-sm font-normal outline-none focus:border-[#A83E70]"
          />
        </label>
        <label className="block text-sm font-semibold text-[#43293A]">
          Téléphone
          <input
            value={mobile}
            onChange={(event) => setMobile(limitPhoneDigits(event.target.value))}
            inputMode="numeric"
            autoComplete="tel"
            placeholder="06…"
            className="mt-1 h-11 w-full rounded-xl border border-[#F0DDE7] px-3 text-sm font-normal outline-none focus:border-[#A83E70]"
          />
        </label>
        <div>
          <p className="text-sm font-semibold text-[#43293A]">Note</p>
          <div className="mt-2 flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`h-11 w-11 rounded-full text-sm font-bold ${rating >= star ? "bg-[#A83E70] text-white" : "bg-[#FCE9F4] text-[#43293A]"}`}
                aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
              >
                {star}
              </button>
            ))}
          </div>
        </div>
        <label className="block text-sm font-semibold text-[#43293A]">
          Commentaire
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            required
            minLength={8}
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
