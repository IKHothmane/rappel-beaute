"use client";

import { useEffect, useState } from "react";

type CustomerHit = { id: string; firstName: string; lastName: string };

export function VisitAdjustPanel({ canWrite }: { canWrite: boolean }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [customer, setCustomer] = useState<CustomerHit | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const needle = query.trim();
    if (needle.length < 2 || customer) {
      setHits([]);
      return;
    }
    const handle = setTimeout(() => {
      void fetch(`/api/customers/?search=${encodeURIComponent(needle)}&limit=6`)
        .then((res) => res.json())
        .then((body: { data?: CustomerHit[] }) => setHits(body.data ?? []))
        .catch(() => setHits([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [query, customer]);

  if (!canWrite) return null;

  async function adjust(delta: 1 | -1) {
    if (!customer) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/loyalty/scan/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adjust-visit",
          customerId: customer.id,
          delta,
          reason,
        }),
      });
      const body = (await res.json()) as { error?: string; visits?: number };
      if (!res.ok) throw new Error(body.error || "Correction impossible.");
      setMessage(`Passages mis à jour : ${body.visits}.`);
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Correction impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-ink">Corriger un passage</h2>
      <p className="mt-1 text-sm text-ink/65">
        Réservé à la direction. Chaque correction demande une raison et reste dans l&apos;audit.
        Le QR institut ne crédite jamais un passage.
      </p>
      <input
        value={customer ? `${customer.firstName} ${customer.lastName}` : query}
        onChange={(event) => {
          setCustomer(null);
          setQuery(event.target.value);
        }}
        placeholder="Nom de la cliente"
        className="mt-3 w-full rounded-xl border border-line px-3 py-2 text-sm"
      />
      <ul className="mt-2 space-y-2">
        {hits.map((hit) => (
          <li key={hit.id}>
            <button
              type="button"
              onClick={() => {
                setCustomer(hit);
                setHits([]);
              }}
              className="w-full rounded-xl border border-line px-3 py-2 text-left text-sm hover:border-primary/40"
            >
              {hit.firstName} {hit.lastName}
            </button>
          </li>
        ))}
      </ul>
      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Raison de la correction"
        className="mt-3 min-h-20 w-full rounded-xl border border-line px-3 py-2 text-sm"
      />
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy || !customer}
          onClick={() => void adjust(-1)}
          className="rounded-full border border-line px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          −1 passage
        </button>
        <button
          type="button"
          disabled={busy || !customer}
          onClick={() => void adjust(1)}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          +1 passage
        </button>
      </div>
      {message ? <p className="mt-3 text-sm font-semibold text-ink">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
