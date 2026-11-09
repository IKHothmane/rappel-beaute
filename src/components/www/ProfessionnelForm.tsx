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
            Votre essai de 15 jours est actif. Connectez-vous avec votre numéro WhatsApp et ce mot de passe temporaire, à modifier à la première connexion.
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
    "h-11 w-full rounded-lg border border-[#eadfe3] bg-white pl-10 pr-3 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-[#faf7f6] disabled:text-ink/40";

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <h2 className="font-display text-2xl font-semibold text-ink">Créer mon accès</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">
            Votre prénom &amp; nom <span className="text-primary">*</span>
          </span>
          <span className="relative">
            <UserIcon />
            <input
              className={field}
              name="name"
              placeholder="Ex. Kenza Berrada"
              required
              type="text"
              maxLength={L.name}
              autoComplete="name"
            />
          </span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">
            Nom de l&apos;institut ou spa <span className="text-primary">*</span>
          </span>
          <span className="relative">
            <BuildingIcon />
            <input
              className={field}
              name="institut"
              placeholder="Ex. Maison de Beauté"
              required
              type="text"
              maxLength={L.institut}
              autoComplete="organization"
            />
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">
            Ville d&apos;implantation <span className="text-primary">*</span>
          </span>
          <span className="relative">
            <PinIcon />
            <Dropdown
              value={city}
              onChange={setCity}
              ariaLabel="Ville d’implantation"
              placeholder="Sélectionner votre ville"
              options={CITIES.map((name) => ({ value: name, label: name }))}
              className="[&>button]:h-11 [&>button]:rounded-lg [&>button]:border-[#eadfe3] [&>button]:bg-white [&>button]:pl-10 [&>button]:focus-visible:ring-2 [&>button]:focus-visible:ring-primary/15"
            />
          </span>
          <input type="hidden" name="ville" value={city} />
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">
            WhatsApp professionnel <span className="text-primary">*</span>
          </span>
          <span className="relative">
            <PhoneIcon />
            <input
              className={field}
              name="phone"
              placeholder="06 12 34 56 78"
              required
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={PHONE_MAX_DIGITS}
              value={phone}
              onChange={(e) => setPhone(limitPhoneDigits(e.target.value))}
            />
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-ink">Site web de l&apos;institut (optionnel)</span>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-ink/60">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-primary"
              checked={noWebsite}
              onChange={(e) => {
                const checked = e.target.checked;
                setNoWebsite(checked);
                if (checked) setWebsite("");
              }}
            />
            Pas de site
          </label>
        </div>
        {noWebsite ? <input type="hidden" name="no_website" value="1" /> : null}
        <span className="relative">
          <LinkIcon />
          <input
            className={field}
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
        </span>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Précisions &amp; besoins spécifiques (optionnel)</span>
        <span className="relative">
          <NoteIcon />
          <textarea
            className="w-full resize-none rounded-lg border border-[#eadfe3] bg-white py-3 pl-10 pr-3 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-primary focus:ring-2 focus:ring-primary/15"
            name="message"
            placeholder="Ex. nombre de cabines, prestations, etc."
            rows={2}
            maxLength={L.message}
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, L.message))}
          />
        </span>
      </label>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="status">
          {error}
        </p>
      ) : null}

      <button
        className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[15px] font-semibold text-white transition hover:bg-primary-dark disabled:opacity-70"
        disabled={loading}
        type="submit"
      >
        {loading ? "Création du compte…" : "Créer mon accès"}
        {!loading ? <span aria-hidden>→</span> : null}
      </button>
    </form>
  );
}

function IconWrap({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35">{children}</span>
  );
}

function UserIcon() {
  return (
    <IconWrap>
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
      </svg>
    </IconWrap>
  );
}

function BuildingIcon() {
  return (
    <IconWrap>
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16M9 7h.01M9 11h.01M9 15h.01M15 7h.01M15 11h.01M15 15h.01" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
      </svg>
    </IconWrap>
  );
}

function PinIcon() {
  return (
    <IconWrap>
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
        <circle cx="12" cy="10" r="2.2" />
      </svg>
    </IconWrap>
  );
}

function PhoneIcon() {
  return (
    <IconWrap>
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M8 4h2l1 4-2 1a12 12 0 006 6l1-2 4 1v2a2 2 0 01-2 2A16 16 0 014 6a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
      </svg>
    </IconWrap>
  );
}

function LinkIcon() {
  return (
    <IconWrap>
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M10 14a5 5 0 007.07 0l1.42-1.42a5 5 0 00-7.07-7.07L10 6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
        <path d="M14 10a5 5 0 00-7.07 0L5.5 11.42a5 5 0 007.07 7.07L14 18" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
      </svg>
    </IconWrap>
  );
}

function NoteIcon() {
  return (
    <span className="pointer-events-none absolute left-3 top-3.5 text-ink/35">
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M9 7h6M9 11h6M9 15h3M6 3h12a1 1 0 011 1v16l-4-2-4 2-4-2-4 2V4a1 1 0 011-1z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
      </svg>
    </span>
  );
}
