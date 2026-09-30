"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { mapEmbedUrl } from "@/lib/geo/morocco-cities";
import type { PublicInstitute } from "@/lib/db/public-directory";

function placeLine(institute: PublicInstitute) {
  return [institute.address, institute.city].filter(Boolean).join(" · ");
}

function priceLabel(price: number) {
  return `${Math.round(price).toLocaleString("fr-MA")} DH`;
}

export function InstituteDirectory({ institutes }: { institutes: PublicInstitute[] }) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("ALL");
  const [selected, setSelected] = useState<string | null>(institutes[0]?.slug ?? null);

  const cities = useMemo(() => {
    return [...new Set(institutes.map((item) => item.city).filter(Boolean) as string[])].sort(
      (a, b) => a.localeCompare(b, "fr"),
    );
  }, [institutes]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return institutes.filter((item) => {
      if (city !== "ALL" && item.city !== city) return false;
      if (!needle) return true;
      const haystack = [item.name, item.city, item.address, ...item.tags]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [institutes, query, city]);

  const focused =
    visible.find((item) => item.slug === selected) ??
    visible.find((item) => item.point) ??
    null;
  const mapUrl = mapEmbedUrl(focused?.point ?? null, focused?.point ? "city" : "country");

  return (
    <div className="border-b border-line bg-white">
      <div className="border-b border-line bg-[#FFF8FB] px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 lg:flex-row lg:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              Annuaire
            </p>
            <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
              Instituts inscrits
            </h1>
          </div>
          <div className="flex flex-1 flex-col gap-2 sm:flex-row lg:justify-end">
            <label className="relative min-w-0 flex-1 lg:max-w-md">
              <span className="sr-only">Rechercher un institut</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nom, ville, soin…"
                className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-3 text-sm text-ink outline-none focus:border-primary"
              />
            </label>
            <label className="sr-only" htmlFor="institute-city">
              Ville
            </label>
            <select
              id="institute-city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-primary"
            >
              <option value="ALL">Toutes les villes</option>
              {cities.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1400px] lg:h-[calc(100dvh-11.5rem)] lg:grid-cols-[minmax(0,460px)_1fr]">
        <div className="flex min-h-[420px] flex-col border-line lg:min-h-0 lg:border-r">
          <p className="border-b border-line px-4 py-3 text-sm text-ink/55 sm:px-5">
            {visible.length} institut{visible.length > 1 ? "s" : ""}
          </p>
          <div className="flex-1 overflow-y-auto">
            {visible.length === 0 ? (
              <p className="px-5 py-10 text-sm text-ink/55">
                Aucun institut ne correspond à cette recherche.
              </p>
            ) : (
              <ul>
                {visible.map((institute) => {
                  const active = institute.slug === focused?.slug;
                  return (
                    <li key={institute.slug} className="border-b border-line">
                      <Link
                        href={`/book/${encodeURIComponent(institute.slug)}/`}
                        onMouseEnter={() => setSelected(institute.slug)}
                        onFocus={() => setSelected(institute.slug)}
                        className={`flex gap-3 px-4 py-4 transition sm:px-5 ${
                          active ? "bg-[#FFF5F8]" : "hover:bg-[#FFF9FB]"
                        }`}
                      >
                        <div className="h-[84px] w-[84px] shrink-0 overflow-hidden rounded-xl bg-[#F6E3EF]">
                          {institute.logoUrl ? (
                            // Logos d'instituts : URL saisie par le salon, pas connue à la compilation.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={institute.logoUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center font-display text-2xl font-bold text-primary">
                              {institute.name.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-ink">{institute.name}</p>
                          {placeLine(institute) ? (
                            <p className="mt-1 flex items-start gap-1 text-xs text-ink/50">
                              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span className="line-clamp-2">{placeLine(institute)}</span>
                            </p>
                          ) : null}
                          {institute.tags.length > 0 ? (
                            <p className="mt-1 truncate text-xs text-ink/45">
                              {institute.tags.join(" · ")}
                            </p>
                          ) : null}
                          {institute.minPrice != null ? (
                            <p className="mt-2 text-xs font-semibold text-primary">
                              À partir de {priceLabel(institute.minPrice)}
                            </p>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="relative h-[320px] bg-[#EEF3EA] lg:h-auto">
          <iframe
            title={focused ? `Carte — ${focused.name}` : "Carte des instituts au Maroc"}
            src={mapUrl}
            className="h-full w-full border-0"
            loading="lazy"
          />
          {focused ? (
            <div className="pointer-events-none absolute bottom-4 left-4 right-4 max-w-sm rounded-2xl bg-white/95 p-3 shadow-md">
              <p className="font-semibold text-ink">{focused.name}</p>
              <p className="mt-0.5 text-xs text-ink/55">
                {placeLine(focused) || "Maroc"}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
