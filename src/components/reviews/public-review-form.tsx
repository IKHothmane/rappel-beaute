"use client";

import { useState } from "react";

export function PublicReviewForm({
  slug,
  token,
  organizationName,
  firstName,
  serviceName,
  alreadySubmitted,
}: {
  slug: string;
  token: string;
  organizationName: string;
  firstName: string;
  serviceName: string;
  alreadySubmitted: boolean;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(alreadySubmitted);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/public/reviews/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, token, rating, comment }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error || "Envoi impossible.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="mt-8 rounded-3xl bg-white p-6 text-center text-sm text-ink/70 shadow-md">
        Merci {firstName}. Votre avis est enregistré et sera lu par {organizationName}.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-3xl bg-white p-6 shadow-md">
      <p className="text-sm text-ink/60">{serviceName}</p>
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className={`h-12 w-12 rounded-full text-lg font-bold ${rating >= star ? "bg-primary text-white" : "bg-[#FFEFF8] text-ink"}`}
            aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
          >
            {star}
          </button>
        ))}
      </div>
      <textarea
        required
        minLength={8}
        maxLength={800}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Votre expérience"
        className="min-h-28 w-full rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-primary"
      />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="h-12 w-full rounded-xl bg-primary text-sm font-bold text-white disabled:opacity-60"
      >
        {busy ? "Envoi…" : "Donner mon avis"}
      </button>
    </form>
  );
}
