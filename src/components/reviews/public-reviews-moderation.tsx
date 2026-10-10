"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  rating: number;
  comment: string;
  status: string;
  createdAt: string;
  customerName: string;
  serviceName: string;
  reportReason: string | null;
};

const LABEL: Record<string, string> = {
  PENDING: "À modérer",
  PUBLISHED: "Publié",
  REJECTED: "Refusé",
  REPORTED: "Signalé",
};

export function PublicReviewsModeration() {
  const [items, setItems] = useState<Item[]>([]);
  const [reason, setReason] = useState("");

  async function load() {
    const res = await fetch("/api/reviews/moderation/");
    if (!res.ok) return;
    const body = (await res.json()) as { reviews?: Item[] };
    setItems(body.reviews ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function act(reviewId: string, action: "publish" | "reject" | "report") {
    await fetch("/api/reviews/moderation/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId, action, reason }),
    });
    setReason("");
    await load();
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-ink">Avis publics</h2>
      <p className="mt-1 text-sm text-ink/60">
        Notes déposées par les clientes. La publication est manuelle, quelle que soit la note.
      </p>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-ink/55">Aucun avis public pour le moment.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-line p-4 text-sm">
              <p className="font-semibold text-ink">
                {item.customerName} · {item.rating}/5 · {LABEL[item.status] ?? item.status}
              </p>
              <p className="mt-1 text-ink/55">{item.serviceName}</p>
              <p className="mt-2 text-ink/80">{item.comment}</p>
              {item.reportReason ? <p className="mt-2 text-red-700">Signalement : {item.reportReason}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => void act(item.id, "publish")} className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white">
                  Publier
                </button>
                <button type="button" onClick={() => void act(item.id, "reject")} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold">
                  Refuser
                </button>
                <button type="button" onClick={() => void act(item.id, "report")} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold">
                  Signaler
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <label className="mt-4 block text-sm">
        Motif de signalement interne
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mt-1 w-full rounded-lg border border-line px-3 py-2"
        />
      </label>
    </section>
  );
}
