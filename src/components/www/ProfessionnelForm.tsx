"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { CITIES, SITE } from "@/lib/site";
import { OsmMapPicker } from "@/components/www/OsmMapPicker";

type OsmSuggestion = {
  id: string;
  label: string;
  full: string;
  latitude: number;
  longitude: number;
  mapsUrl: string;
};

export function ProfessionnelForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoName, setLogoName] = useState<string | null>(null);
  const [localisation, setLocalisation] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [geoSuccess, setGeoSuccess] = useState<string | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [suggestions, setSuggestions] = useState<OsmSuggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [mapOpen, setMapOpen] = useState(false);
  const skipSuggestRef = useRef(false);
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setSuggestOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (skipSuggestRef.current) {
      skipSuggestRef.current = false;
      return;
    }

    const q = localisation.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setSuggestOpen(false);
      setSuggestLoading(false);
      return;
    }

    const controller = new AbortController();
    setSuggestLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/geo/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { suggestions?: OsmSuggestion[] };
        const list = data.suggestions ?? [];
        setSuggestions(list);
        setSuggestOpen(list.length > 0);
        setActiveIndex(-1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setSuggestions([]);
          setSuggestOpen(false);
        }
      } finally {
        setSuggestLoading(false);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [localisation]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 700);
  }

  function onLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setLogoPreview(null);
      setLogoName(null);
      return;
    }
    setLogoName(file.name);
    const url = URL.createObjectURL(file);
    setLogoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }

  function selectSuggestion(item: OsmSuggestion) {
    skipSuggestRef.current = true;
    setLocalisation(item.label);
    setLat(String(item.latitude));
    setLng(String(item.longitude));
    setMapsUrl(item.mapsUrl);
    setSuggestions([]);
    setSuggestOpen(false);
    setActiveIndex(-1);
    setGeoSuccess("Adresse sélectionnée via OpenStreetMap.");
  }

  function onLocalisationChange(value: string) {
    setLocalisation(value);
    setGeoSuccess(null);
    setLat("");
    setLng("");
    setMapsUrl("");
  }

  function onMapPick(payload: {
    address: string;
    latitude: number;
    longitude: number;
    mapsUrl: string;
  }) {
    skipSuggestRef.current = true;
    setLocalisation(payload.address);
    setLat(String(payload.latitude));
    setLng(String(payload.longitude));
    setMapsUrl(payload.mapsUrl);
    setSuggestions([]);
    setSuggestOpen(false);
    setGeoSuccess("Position choisie sur la carte OpenStreetMap.");
  }

  if (sent) {
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
            Demande transmise avec succès !
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink/60">
            Notre équipe vous contactera via WhatsApp sous 24h pour configurer vos prestations et
            ouvrir votre console.
          </p>
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
          <span className="text-sm font-bold tracking-wide text-ink">Accès calibré à la main</span>
          <p className="mt-0.5 text-xs leading-normal text-ink/55">
            Votre accès sur-mesure sera activé sous 24h par notre équipe. Aucun compte en
            libre-service — nous paramétrons chaque institut avec soin.
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
          />
        </label>
      </div>

      <div className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">
          Logo de l&apos;institut{" "}
          <span className="font-normal text-ink/40">(optionnel)</span>
        </span>
        <label className="flex h-[4.5rem] cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line bg-paper px-3 transition hover:border-primary/40 hover:bg-primary-light/30">
          <input
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            name="logo"
            onChange={onLogoChange}
            type="file"
          />
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="" className="h-full w-full object-contain p-1" src={logoPreview} />
            ) : (
              <svg
                className="h-5 w-5 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-ink">
              {logoName ? "Changer le logo" : "Ajouter un logo"}
            </span>
            <span className="mt-0.5 block truncate text-xs text-ink/45">
              {logoName ?? "PNG, JPG, WEBP ou SVG · max. 2 Mo"}
            </span>
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-1.5 text-sm" ref={wrapRef}>
        <span className="font-medium text-ink">Localisation / adresse</span>
        <input type="hidden" name="lat" value={lat} />
        <input type="hidden" name="lng" value={lng} />
        <input type="hidden" name="maps_url" value={mapsUrl} />

        <div className="relative">
          <input
            className={field}
            name="localisation"
            placeholder="ex. Bd Anfa, Maarif, Casablanca"
            required
            type="text"
            value={localisation}
            autoComplete="off"
            role="combobox"
            aria-expanded={suggestOpen}
            aria-controls={listId}
            aria-autocomplete="list"
            onChange={(e) => onLocalisationChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setSuggestOpen(true);
            }}
            onKeyDown={(e) => {
              if (!suggestOpen || suggestions.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => (i + 1) % suggestions.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
              } else if (e.key === "Enter" && activeIndex >= 0) {
                e.preventDefault();
                selectSuggestion(suggestions[activeIndex]!);
              } else if (e.key === "Escape") {
                setSuggestOpen(false);
              }
            }}
          />

          {suggestLoading ? (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-ink/40">
              OSM…
            </span>
          ) : null}

          {suggestOpen && suggestions.length > 0 ? (
            <ul
              id={listId}
              role="listbox"
              className="absolute z-40 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-line bg-white py-1 shadow-lg"
            >
              {suggestions.map((item, index) => (
                <li key={item.id} role="option" aria-selected={index === activeIndex}>
                  <button
                    type="button"
                    className={`flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition ${
                      index === activeIndex ? "bg-primary-light" : "hover:bg-primary-light/60"
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSuggestion(item)}
                  >
                    <span className="text-sm font-medium text-ink">{item.label}</span>
                    <span className="line-clamp-1 text-[11px] text-ink/45">{item.full}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <span className="text-xs text-ink/40">
          Tapez au moins 3 caractères pour les suggestions OpenStreetMap, ou choisissez sur la
          carte.
        </span>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setSuggestOpen(false);
              setMapOpen(true);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-ink transition hover:border-primary/40 hover:bg-primary-light/40"
          >
            <svg
              className="h-3.5 w-3.5 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            Choisir sur la carte
          </button>
        </div>

        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="truncate text-xs font-medium text-primary hover:underline"
          >
            Voir sur OpenStreetMap →
          </a>
        ) : null}

        {geoSuccess ? (
          <p className="text-xs font-medium text-emerald-600">{geoSuccess}</p>
        ) : null}
      </div>

      <OsmMapPicker
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        onPick={onMapPick}
        initialLat={lat ? Number(lat) : undefined}
        initialLng={lng ? Number(lng) : undefined}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Ville d&apos;implantation</span>
          <select className={`${field} cursor-pointer appearance-none`} name="ville" required defaultValue="">
            <option disabled value="">
              Sélectionner votre ville
            </option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">WhatsApp professionnel</span>
          <input
            className={field}
            name="phone"
            placeholder="+212 6 XX XX XX XX"
            required
            type="tel"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Adresse e-mail professionnelle</span>
        <input
          className={field}
          name="email"
          placeholder="contact@institut.ma"
          required
          type="email"
        />
      </label>

      <div className="flex flex-col gap-1.5 text-sm">
        <span className="flex items-center justify-between font-medium text-ink">
          <span>Formule souhaitée pour l&apos;essai</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gold">
            14 jours sans engagement
          </span>
        </span>
        <input type="hidden" name="plan" value="rappel-beauty" />
        <div className="flex h-12 items-center justify-between rounded-lg border border-primary/25 bg-primary-light/40 px-4">
          <div className="flex items-center gap-2.5">
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
              Formule unique
            </span>
            <span className="text-sm font-semibold text-ink">{SITE.name}</span>
          </div>
          <span className="text-sm font-bold text-primary">399 DH/mois</span>
        </div>
        <p className="text-xs text-ink/45">
          Toutes les fonctionnalités incluses · Sans engagement · Résiliable à tout moment
        </p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Précisions &amp; besoins spécifiques</span>
        <textarea
          className="resize-none rounded-lg border border-line bg-paper p-4 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-primary focus:ring-2 focus:ring-primary/20"
          name="message"
          placeholder="Nombre de cabines, prestations phares (soins visage, hammam, onglerie), logiciel actuellement utilisé..."
          rows={3}
        />
      </label>

      <div className="flex flex-col gap-3 pt-1">
        <button
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-white shadow-lg transition-all hover:bg-primary-dark active:scale-[0.99] disabled:opacity-70"
          disabled={loading}
          type="submit"
        >
          {loading ? (
            <>Configuration en cours...</>
          ) : (
            <>
              Demander l&apos;activation de mon institut
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
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-ink/45">
          <svg className="h-4 w-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
          14 jours offerts · Sans carte bancaire · Conformité Loi 09-08 (CNDP Maroc)
        </p>
        <p className="text-center text-[11px] text-ink/35">
          Formulaire vitrine · {SITE.name} — aucune donnée métier n&apos;est lue ici.
        </p>
      </div>
    </form>
  );
}
