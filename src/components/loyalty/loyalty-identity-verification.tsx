"use client";

import { useState, type FormEvent } from "react";
import { normalizeLoyaltyPhone } from "@/lib/loyalty/profile-input";
import { listCustomers } from "@/modules/customers/service";
import type { CustomerListItem } from "@/types/customer";

type Verification = {
  code: string;
  mode: "enroll" | "recover";
  firstName: string;
  lastName: string;
  phone: string;
  expiresAt: string;
};

const field = "min-h-11 w-full rounded-lg border border-[#CBA8BB] px-3 py-2 text-sm";
const button = "min-h-11 rounded-lg bg-[#981C52] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";

async function verificationRequest<T>(options: { code: string } | { body: object }): Promise<T> {
  const response = await fetch(
    "code" in options ? "/api/loyalty/verification/?code=" + encodeURIComponent(options.code) : "/api/loyalty/verification/",
    "body" in options
      ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(options.body) }
      : { cache: "no-store" },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "La vérification a échoué.");
  return data as T;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "La vérification a échoué.";
}

export function LoyaltyIdentityVerification({
  onApproved,
  focusedCustomer,
}: {
  onApproved: () => void;
  focusedCustomer?: { id: string; name: string };
}) {
  const [code, setCode] = useState("");
  const [request, setRequest] = useState<Verification | null>(null);
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<CustomerListItem[] | null>(null);
  const [customer, setCustomer] = useState<CustomerListItem | null>(null);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [phoneChangeConfirmed, setPhoneChangeConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const phoneChange = Boolean(
    request && customer && normalizeLoyaltyPhone(request.phone) !== normalizeLoyaltyPhone(customer.phone),
  );

  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequest(null);
    setSearch("");
    setMatches(null);
    setCustomer(null);
    setIdentityConfirmed(false);
    setPhoneChangeConfirmed(false);
    setSuccess("");
    setBusy(true);
    setError("");
    try {
      const result = await verificationRequest<{ request: Verification }>({ code: code.trim().toUpperCase() });
      setRequest(result.request);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function findCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMatches(null);
    setCustomer(null);
    setPhoneChangeConfirmed(false);
    try {
      const result = await listCustomers({ search: search.trim(), limit: 10 });
      setMatches(result.data);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function approve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request || !identityConfirmed || (request.mode === "recover" && !customer) || (phoneChange && !phoneChangeConfirmed)) return;
    setBusy(true);
    setError("");
    try {
      await verificationRequest({ body: { code: request.code, customerId: customer?.id, identityConfirmed, phoneChangeConfirmed } });
      setSuccess("Accès approuvé. La cliente peut ouvrir sa carte sur son téléphone.");
      setRequest(null);
      setMatches(null);
      setCustomer(null);
      setCode("");
      onApproved();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function revokeSessions() {
    if (busy || !focusedCustomer) return;
    if (!window.confirm(`Déconnecter tous les appareils de ${focusedCustomer.name} de sa carte fidélité ?`)) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await verificationRequest({ body: { action: "revoke", customerId: focusedCustomer.id } });
      setSuccess("Toutes les sessions de cette carte ont été révoquées.");
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="mt-4 rounded-[26px] border border-[#F1E8EC] bg-white p-5 text-[#30202C] shadow-sm">
      <summary className="cursor-pointer text-sm font-bold">Vérifier l’identité d’une cliente</summary>
      <p className="mt-3 text-sm text-[#765E6B]">Saisissez le code affiché sur son téléphone et vérifiez son identité en personne.</p>
      <form className="mt-3 grid gap-2" onSubmit={lookup}>
        <label className="grid gap-1 text-sm font-medium">
          Code de vérification
          <input
            className={field}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={12}
            pattern="[0-9A-Fa-f]{12}"
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </label>
        <button className={button} disabled={busy}>Afficher la demande</button>
      </form>
      {request && (
        <div className="mt-4 space-y-3 border-t border-[#F1E8EC] pt-4 text-sm">
          <h3 className="font-bold">{request.mode === "recover" ? "Récupération de carte" : "Première inscription"}</h3>
          <p className="break-words">{request.firstName} {request.lastName} · {request.phone}</p>
          <>
              <form className="grid gap-2" onSubmit={findCustomer}>
                <label className="grid gap-1 font-medium">
                  {request.mode === "recover" ? "Rechercher la fiche cliente vérifiée" : "Rattacher une fiche existante (facultatif)"}
                  <input className={field} placeholder="Nom ou ancien numéro" minLength={2} required value={search} onChange={(event) => setSearch(event.target.value)} />
                </label>
                <button className={button} disabled={busy}>Rechercher</button>
              </form>
              {matches && (matches.length ? (
                <fieldset className="grid gap-2">
                  <legend className="font-medium">Fiche à récupérer</legend>
                  {matches.map((match) => (
                    <label key={match.id} className="flex items-start gap-2 break-all">
                      <input type="radio" name="recoveryCustomer" checked={customer?.id === match.id} onChange={() => {
                        setCustomer(match);
                        setIdentityConfirmed(false);
                        setPhoneChangeConfirmed(false);
                      }} />
                      <span>{match.firstName} {match.lastName} · {match.phone.startsWith("WL") ? "Sans téléphone" : match.phone}</span>
                    </label>
                  ))}
                </fieldset>
              ) : <p role="status">Aucune fiche trouvée.</p>)}
              {request.mode === "enroll" && customer && (
                <button type="button" className="text-left font-medium text-[#981C52] underline" onClick={() => {
                  setCustomer(null);
                  setIdentityConfirmed(false);
                  setPhoneChangeConfirmed(false);
                }}>Créer une nouvelle fiche</button>
              )}
          </>
          <form className="grid gap-3" onSubmit={approve}>
            <label className="flex items-start gap-2">
              <input type="checkbox" required checked={identityConfirmed} onChange={(event) => setIdentityConfirmed(event.target.checked)} />
              <span>J’ai vérifié en personne l’identité de la cliente et son numéro.</span>
            </label>
            {phoneChange && (
              <label className="flex items-start gap-2">
                <input type="checkbox" required checked={phoneChangeConfirmed} onChange={(event) => setPhoneChangeConfirmed(event.target.checked)} />
                <span>J’autorise le remplacement du numéro sur la fiche sélectionnée.</span>
              </label>
            )}
            <button className={button} disabled={busy || !identityConfirmed || (request.mode === "recover" && !customer) || (phoneChange && !phoneChangeConfirmed)}>
              Approuver l’accès à la carte
            </button>
          </form>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-800" role="alert">{error}</p>}
      {focusedCustomer && (
        <button type="button" className="mt-4 min-h-11 text-left text-sm font-medium text-[#981C52] underline disabled:opacity-50"
          disabled={busy} onClick={() => void revokeSessions()}>
          Déconnecter les appareils de {focusedCustomer.name}
        </button>
      )}
      {success && <p className="mt-3 text-sm text-emerald-800" role="status">{success}</p>}
    </details>
  );
}
