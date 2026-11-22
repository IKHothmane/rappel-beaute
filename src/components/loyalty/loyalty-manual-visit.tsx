"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Gift, Plus, Search } from "lucide-react";
import { listCustomers } from "@/modules/customers/service";
import type { CustomerListItem } from "@/types/customer";

type Preview = {
  validationId: string;
  customerId: string;
  customerName: string;
  card: {
    organizationName: string;
    visits: number;
    cycle: number;
    visitsPerReward: number;
    remaining: number;
    rewardLabel: string;
  };
};

type Confirmation = {
  customerId: string;
  customerName: string;
  cycle: number;
  visitsPerReward: number;
  promoCode: string | null;
  validatedAt: string;
};

class RequestError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
  }
}

async function post<T>(url: string, body: object): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string; code?: string };
  if (!response.ok) throw new RequestError(data.error || "La demande a échoué.", response.status, data.code);
  return data;
}

const field = "min-h-11 w-full rounded-lg border border-[#CBA8BB] px-3 py-2 text-sm";
const primary =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#981C52] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#7d1643] disabled:opacity-50";
const secondary = "min-h-11 w-full rounded-xl border border-[#E7B9CD] text-sm font-semibold text-[#981C52] disabled:opacity-50";

/**
 * Valider un passage à la main (sans caméra) : l'équipe cherche la cliente par nom ou téléphone, ou saisit le code
 * affiché sous le QR de sa carte. Même parcours que le scan : aperçu de la carte, puis confirmation séparée (+1 passage).
 */
export function LoyaltyManualVisit({
  onIdentified,
  onConfirmed,
  focusedCustomer,
  canRevoke,
}: {
  onIdentified: (customerId: string) => void;
  onConfirmed: (customerId: string) => void;
  focusedCustomer?: { id: string; name: string };
  canRevoke: boolean;
}) {
  const [mode, setMode] = useState<"customer" | "code">("customer");
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<CustomerListItem[] | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function reset() {
    setPreview(null);
    setMatches(null);
    setResult(null);
    setError("");
    setNotice("");
  }

  async function identify(body: { token: string } | { customerId: string }) {
    setBusy(true);
    setError("");
    try {
      const found = await post<Preview>("/api/loyalty/scan/", { action: "scan", ...body });
      setPreview(found);
      setMatches(null);
      onIdentified(found.customerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de lire la carte.");
    } finally {
      setBusy(false);
    }
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    setResult(null);
    setPreview(null);
    setNotice("");
    if (mode === "code") {
      await identify({ token: value });
      return;
    }
    setBusy(true);
    setError("");
    try {
      const found = await listCustomers({ search: value, limit: 8 });
      setMatches(found.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "La recherche a échoué.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(current: Preview) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const done = await post<Confirmation>("/api/loyalty/scan/", { action: "confirm", validationId: current.validationId });
      setResult(done);
      setPreview(null);
      setQuery("");
      onConfirmed(done.customerId);
    } catch (err) {
      const duplicate = err instanceof RequestError && err.code === "ALREADY_VALIDATED";
      setError(err instanceof Error ? err.message : "Impossible de confirmer le passage.");
      if (duplicate) {
        setPreview(null);
        onConfirmed(current.customerId);
      }
    } finally {
      setBusy(false);
    }
  }

  async function revokeSessions() {
    if (busy || !focusedCustomer) return;
    if (!window.confirm(`Déconnecter tous les appareils de ${focusedCustomer.name} de sa carte fidélité ?`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await post("/api/loyalty/verification/", { action: "revoke", customerId: focusedCustomer.id });
      setNotice("Toutes les sessions de cette carte ont été révoquées.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "La révocation a échoué.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 rounded-[26px] border border-[#F1E8EC] bg-white p-5 text-[#30202C] shadow-sm" aria-labelledby="loyalty-manual-title">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF1F6] text-[#981C52]">
          <CheckCircle2 size={22} aria-hidden />
        </span>
        <div>
          <h2 id="loyalty-manual-title" className="text-base font-bold">Valider le passage</h2>
          <p className="text-sm text-[#765E6B]">Sans caméra : cherchez la cliente ou saisissez le code de sa carte.</p>
        </div>
      </div>

      <div role="tablist" aria-label="Méthode de recherche" className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-[#FBEFF4] p-1">
        {([["customer", "Nom ou téléphone"], ["code", "Code de la carte"]] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => { setMode(value); reset(); setQuery(""); }}
            className={`min-h-10 rounded-lg px-2 text-sm font-semibold ${mode === value ? "bg-white text-[#30202C] shadow-sm" : "text-[#765E6B]"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <form className="mt-3 grid gap-2" onSubmit={search}>
        <label className="grid gap-1 text-sm font-medium">
          <span className="sr-only">{mode === "code" ? "Code de la carte" : "Nom ou téléphone de la cliente"}</span>
          <input
            className={field}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={mode === "code" ? "Ex. E4FB (code sous le QR)" : "Ex. Sara Alami ou 0612345678"}
            autoComplete="off"
            spellCheck={false}
            maxLength={mode === "code" ? 40 : 80}
            minLength={mode === "code" ? 4 : 2}
            required
          />
        </label>
        <button className={primary} disabled={busy}>
          <Search size={18} aria-hidden />
          {mode === "code" ? "Trouver la carte" : "Rechercher"}
        </button>
      </form>

      {matches && (matches.length === 0 ? (
        <p role="status" className="mt-3 text-sm text-[#765E6B]">Aucune cliente trouvée.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {matches.map((match) => (
            <li key={match.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => void identify({ customerId: match.id })}
                className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-[#F0DDE6] px-3 py-2 text-left text-sm hover:bg-[#FCF7F9] disabled:opacity-50"
              >
                <span className="min-w-0 break-words font-semibold">{match.firstName} {match.lastName}</span>
                <span className="shrink-0 text-xs text-[#765E6B]">{match.phone?.startsWith("WL") ? "Sans téléphone" : match.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      ))}

      {preview && (
        <div className="mt-4 space-y-4">
          <div className="space-y-3 rounded-2xl bg-[#FCF7F9] p-4">
            <div>
              <p role="status" className="text-xs font-semibold text-[#765E6B]">
                {busy ? "Enregistrement du passage…" : "Cliente identifiée · En attente de confirmation"}
              </p>
              <p className="mt-1 text-base font-bold">{preview.customerName}</p>
            </div>
            <div className="border-t border-[#F0DDE6] pt-3">
              <p className="text-2xl font-bold text-[#981C52]">{preview.card.cycle} / {preview.card.visitsPerReward}</p>
              <p className="mt-1 text-sm text-[#765E6B]">
                {preview.card.visits} {preview.card.visits === 1 ? "passage enregistré" : "passages enregistrés"}
              </p>
              <p className="mt-2 flex items-start gap-2 text-sm">
                <Gift size={16} className="mt-0.5 shrink-0 text-[#981C52]" aria-hidden />
                <span>Encore {preview.card.remaining} {preview.card.remaining === 1 ? "passage" : "passages"} · {preview.card.rewardLabel}</span>
              </p>
            </div>
          </div>
          <button type="button" disabled={busy} onClick={() => void confirm(preview)} className={primary}>
            <Plus size={18} aria-hidden />
            {busy ? "Confirmation…" : "Valider le passage (+1)"}
          </button>
          <button type="button" disabled={busy} onClick={reset} className={secondary}>Annuler</button>
        </div>
      )}

      {result && (
        <div role="status" className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="shrink-0" aria-hidden />
          <div>
            <p className="font-bold">Passage enregistré</p>
            <p>{result.customerName} · {result.cycle} / {result.visitsPerReward}</p>
            {result.promoCode && <p>Code promo {result.promoCode} activé</p>}
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}
      {notice && <p role="status" className="mt-3 text-sm text-emerald-800">{notice}</p>}

      {canRevoke && focusedCustomer && (
        <button
          type="button"
          className="mt-4 min-h-11 text-left text-sm font-medium text-[#981C52] underline disabled:opacity-50"
          disabled={busy}
          onClick={() => void revokeSessions()}
        >
          Déconnecter les appareils de {focusedCustomer.name}
        </button>
      )}
    </section>
  );
}
