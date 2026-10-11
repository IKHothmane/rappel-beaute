"use client";

import { useState } from "react";
import { shortCardCode } from "@/lib/loyalty/card-code";

type Preview = {
  token: string;
  customerName: string;
  appointmentId: string | null;
  serviceName: string | null;
  amount: number | null;
  visits: number;
  visitsPerReward: number;
  rewardLabel: string;
};

function money(amount: number) {
  return `${amount.toLocaleString("fr-FR")} DH`;
}

function extractToken(value: string) {
  const upper = value.toUpperCase();
  const card = upper.match(/RBLOY_[A-Z2-9]+/);
  if (card) return card[0];
  return upper.trim();
}

export function LoyaltyScanPage({
  embedded = false,
  onPreview,
  onValidated,
}: {
  embedded?: boolean;
  onPreview?: (preview: Preview | null) => void;
  onValidated?: () => void;
}) {
  const [token, setToken] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function scan() {
    const next = extractToken(token);
    setBusy(true);
    setError(null);
    setDone(null);
    setPreview(null);
    if (!next) {
      setError("Entrez le code scanné de la cliente.");
      onPreview?.(null);
      setBusy(false);
      return;
    }
    if (next.startsWith("RBJOIN_")) {
      setError("Ce code est le QR de l'institut. Entrez le code de la carte cliente.");
      onPreview?.(null);
      setBusy(false);
      return;
    }
    try {
      const res = await fetch(`/api/loyalty/scan/?token=${encodeURIComponent(next)}`);
      const body = (await res.json()) as Preview & { error?: string };
      if (!res.ok) throw new Error(body.error || "Code introuvable.");
      setPreview(body);
      setToken(shortCardCode(body.token));
      onPreview?.(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code introuvable.");
      onPreview?.(null);
    } finally {
      setBusy(false);
    }
  }

  async function validate() {
    if (!preview?.appointmentId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/loyalty/scan/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: preview.token, appointmentId: preview.appointmentId }),
      });
      const body = (await res.json()) as {
        error?: string;
        visits?: number;
        serviceName?: string;
        amount?: number;
        customerName?: string;
      };
      if (!res.ok) throw new Error(body.error || "Validation impossible.");
      setDone(
        `Passage validé. ${body.customerName} · ${body.serviceName} · ${money(body.amount ?? 0)}. Total : ${body.visits} passages.`,
      );
      setPreview(null);
      onPreview?.(null);
      onValidated?.();
      setToken("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation impossible.");
    } finally {
      setBusy(false);
    }
  }

  const form = (
    <>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void scan();
        }}
      >
        <input
          id="loyalty-card-code"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Ex : RBLOY…"
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-sm"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={busy || !token.trim()}
          className="h-11 shrink-0 rounded-xl bg-primary px-5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {embedded ? "Valider" : "Lire le code"}
        </button>
      </form>
      {preview ? (
        <div className="mt-3 rounded-xl border border-line p-3 text-sm">
          <p className="font-semibold text-ink">{preview.customerName}</p>
          <p className="mt-1 text-ink/70">
            {preview.visits} passages · {preview.rewardLabel} à {preview.visitsPerReward}
          </p>
          {preview.appointmentId ? (
            <p className="mt-1 text-ink/70">
              {preview.serviceName} · {money(preview.amount ?? 0)}
            </p>
          ) : (
            <p className="mt-1 text-ink/70">Aucun rendez-vous terminé à valider.</p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                onPreview?.(null);
              }}
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
            >
              Effacer
            </button>
            {preview.appointmentId ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void validate()}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Valider le passage
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {done ? <p className="mt-3 text-sm font-semibold text-ink">{done}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </>
  );

  if (embedded) return form;

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="text-[18px] font-bold text-ink">Code scanné</h3>
      <p className="mt-1 text-[13px] text-ink/55">
        Entrez le code de la carte de la cliente, après l&apos;avoir scanné.
      </p>
      {form}
    </section>
  );
}
