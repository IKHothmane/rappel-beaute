"use client";

import { useState } from "react";

export function PublicReviewReport({ slug, reviewId }: { slug: string; reviewId: string }) {
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const res = await fetch("/api/public/reviews/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "report", slug, reviewId, reason }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error || "Signalement impossible.");
      return;
    }
    setSent(true);
  }

  if (sent) return <p className="mt-3 text-xs text-ink/50">Signalement transmis à l&apos;institut.</p>;

  return (
    <form onSubmit={onSubmit} className="mt-3 flex gap-2">
      <input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        minLength={3}
        maxLength={300}
        required
        placeholder="Signaler cet avis"
        className="w-full rounded-lg border border-line px-3 py-2 text-xs"
      />
      <button type="submit" className="shrink-0 text-xs font-semibold text-primary">
        Envoyer
      </button>
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </form>
  );
}
