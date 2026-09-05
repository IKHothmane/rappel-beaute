"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function HomeSearch() {
  const router = useRouter();
  const [treatment, setTreatment] = useState("");
  const [location, setLocation] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (treatment.trim()) params.set("q", treatment.trim());
    if (location.trim()) params.set("ville", location.trim());
    const qs = params.toString();
    router.push(qs ? `/fonctionnalites/?${qs}` : "/#explore");
  }

  return (
    <div className="w-full max-w-4xl rounded-2xl border border-line bg-paper p-2 text-ink shadow-2xl md:rounded-full md:p-2.5">
      <form
        className="flex flex-col items-stretch divide-y divide-line md:flex-row md:items-center md:divide-x md:divide-y-0"
        onSubmit={onSubmit}
      >
        <div className="flex flex-1 items-center px-4 py-3 md:py-1">
          <svg
            className="mr-3 h-5 w-5 flex-shrink-0 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
          <div className="w-full text-left">
            <label
              className="block text-[10px] font-bold uppercase tracking-wider text-ink/55"
              htmlFor="treatment-input"
            >
              Que cherchez-vous ?
            </label>
            <input
              className="w-full border-none bg-transparent p-0 text-sm font-medium text-ink placeholder:text-ink/40 focus:outline-none focus:ring-0"
              id="treatment-input"
              placeholder="Nom du salon, coupe, balayage, soin visage…"
              type="text"
              value={treatment}
              onChange={(e) => setTreatment(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-1 items-center px-4 py-3 md:py-1">
          <svg
            className="mr-3 h-5 w-5 flex-shrink-0 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
            <path
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
          <div className="w-full text-left">
            <label
              className="block text-[10px] font-bold uppercase tracking-wider text-ink/55"
              htmlFor="location-input"
            >
              Où ?
            </label>
            <input
              className="w-full border-none bg-transparent p-0 text-sm font-medium text-ink placeholder:text-ink/40 focus:outline-none focus:ring-0"
              id="location-input"
              placeholder="Casablanca, Rabat, Marrakech, Tanger…"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>

        <div className="p-1 md:p-0">
          <button
            className="flex w-full items-center justify-center rounded-xl bg-primary px-8 py-3.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-dark md:w-auto md:rounded-full"
            type="submit"
          >
            Rechercher
          </button>
        </div>
      </form>
    </div>
  );
}
