"use client";

import { useEffect, useState } from "react";
import { APP_LOGIN_HREF, CITIES } from "@/lib/site";
import { PHONE_MAX_DIGITS, limitPhoneDigits } from "@/lib/validation/customer";
import { PROFESSIONAL_SIGNUP_LIMITS as L } from "@/lib/validation/professional-signup";
import { Dropdown } from "@/components/ui/dropdown";

export function ProfessionnelForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noWebsite, setNoWebsite] = useState(false);
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [city, setCity] = useState("");
  const [credentials, setCredentials] = useState<{ identifier: string; temporaryPassword: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!city) { setError("Sélectionnez votre ville."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/public/signup/", {
        method: "POST",
        body: new FormData(e.currentTarget),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; credentials?: { identifier: string; temporaryPassword: string } };
      if (!res.ok) {
        setError(data.error || "Impossible de créer le compte. Réessayez.");
        return;
      }
      if (!data.credentials?.identifier || !data.credentials.temporaryPassword) {
        setError("Votre compte a été créé, mais les accès n’ont pas pu être affichés. Contactez notre équipe avant de réessayer.");
        return;
      }
      setCredentials(data.credentials);
      setSent(true);
    } catch {
      setError("Réseau indisponible. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!sent) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [sent]);

  if (sent && credentials) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-line bg-primary-light/50 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </span>
        <div>
          <p className="font-display text-xl font-semibold text-ink">
            Votre compte est prêt
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink/60">
            Votre essai de 7 jours est actif. Connectez-vous avec votre numéro WhatsApp et ce mot de passe temporaire, à modifier à la première connexion.
          </p>
          <dl className="mt-4 space-y-3 rounded-xl border border-line bg-white p-4 text-sm">
            <div><dt className="text-ink/55">Numéro WhatsApp</dt><dd className="mt-1 select-text font-semibold text-ink">{credentials.identifier}</dd></div>
            <div><dt className="text-ink/55">Mot de passe temporaire</dt><dd className="mt-1 select-text font-mono text-xl font-bold tracking-widest text-primary">{credentials.temporaryPassword}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-ink/60">Conservez ces accès avant de quitter cette page.</p>
          <a
            className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white"
            href={`${APP_LOGIN_HREF}?identifier=${encodeURIComponent(credentials.identifier)}`}
          >
            Se connecter
          </a>
        </div>
      </div>
    );
  }

  const field =
    "h-12 w-full rounded-lg border border-line bg-paper px-4 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="mb-2 flex items-start gap-3 rounded-xl bg-primary-light/50 p-4">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </div>
        <div>
          <span className="text-sm font-bold tracking-wide text-ink">Votre accès avec WhatsApp</span>
          <p className="mt-0.5 text-xs leading-normal text-ink/55">
            Votre numéro WhatsApp devient votre identifiant. Vos accès s’affichent dès la création du compte.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Votre prénom &amp; nom</span>
          <input
            className={field}
            name="name"
            placeholder="ex. Kenza Berrada"
            required
            type="text"
            maxLength={L.name}
            autoComplete="name"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Nom de l&apos;institut ou spa</span>
          <input
            className={field}
            name="institut"
            placeholder="ex. Maison de Beauté L'Écrin"
            required
            type="text"
            maxLength={L.institut}
            autoComplete="organization"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Ville d&apos;implantation</span>
          <Dropdown value={city} onChange={setCity} ariaLabel="Ville d’implantation" placeholder="Sélectionner votre ville" options={CITIES.map((name) => ({ value: name, label: name }))} className="[&>button]:h-12 [&>button]:bg-paper [&>button]:focus-visible:ring-2 [&>button]:focus-visible:ring-primary/20" />
          <input type="hidden" name="ville" value={city} />
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">WhatsApp professionnel</span>
          <input
            className={field}
            name="phone"
            placeholder="0612345678"
            required
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={PHONE_MAX_DIGITS}
            value={phone}
            onChange={(e) => setPhone(limitPhoneDigits(e.target.value))}
          />
        </label>
      </div>

      <div className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-ink">Site web de l&apos;institut</span>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={noWebsite}
              onChange={(e) => {
                const checked = e.target.checked;
                setNoWebsite(checked);
                if (checked) setWebsite("");
              }}
            />
            Non
          </label>
        </div>
        {noWebsite ? <input type="hidden" name="no_website" value="1" /> : null}
        <input
          className={`${field} disabled:cursor-not-allowed disabled:bg-white disabled:text-ink/40`}
          name={noWebsite ? undefined : "website"}
          placeholder={noWebsite ? "Pas de site web" : "www.moninstitut.ma"}
          type="text"
          inputMode="url"
          autoComplete="url"
          maxLength={L.website}
          value={website}
          disabled={noWebsite}
          onChange={(e) => setWebsite(e.target.value.slice(0, L.website))}
        />
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Précisions &amp; besoins spécifiques</span>
        <textarea
          className="resize-none rounded-lg border border-line bg-paper p-4 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-primary focus:ring-2 focus:ring-primary/20"
          name="message"
          placeholder="Nombre de cabines, prestations phares (soins visage, hammam, onglerie), logiciel actuellement utilisé..."
          rows={3}
          maxLength={L.message}
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, L.message))}
        />
        <span className="text-right text-[11px] text-ink/40">
          {message.length}/{L.message}
        </span>
      </label>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 pt-1">
        <button
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-white shadow-lg transition-all hover:bg-primary-dark active:scale-[0.99] disabled:opacity-70"
          disabled={loading}
          type="submit"
        >
          {loading ? (
            <>Création du compte…</>
          ) : (
            <>
              Créer mon accès
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
