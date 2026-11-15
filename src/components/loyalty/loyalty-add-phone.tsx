"use client";

import { useCallback, useEffect, useState } from "react";
import { PhoneForwarded } from "lucide-react";
import { probeLoyaltyMerge } from "@/modules/loyalty/service";

type Availability = "unknown" | "available" | "unavailable";

const CACHE_MS = 10 * 60 * 1000;
let cached: { value: "available" | "unavailable"; at: number } | null = null;
let inflight: Promise<"available" | "unavailable" | "unknown"> | null = null;

function readCache(): Availability {
  return cached && Date.now() - cached.at < CACHE_MS ? cached.value : "unknown";
}

/**
 * Disponibilité de la fusion pour ce compte : désactivée par l'institut (404 MERGE_DISABLED) ou rôle sans droit
 * (403 FORBIDDEN) => « unavailable », sans message. Une seule sonde est émise (résultat gardé 10 min).
 */
export function useLoyaltyMergeAvailability(enabled: boolean) {
  const [state, setState] = useState<Availability>(() => readCache());

  useEffect(() => {
    if (!enabled) return;
    const known = readCache();
    if (known !== "unknown") {
      setState(known);
      return;
    }
    let cancelled = false;
    inflight ??= probeLoyaltyMerge().finally(() => {
      inflight = null;
    });
    void inflight.then((result) => {
      if (result !== "unknown") cached = { value: result, at: Date.now() };
      if (!cancelled) setState(result === "unknown" ? "unavailable" : result);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const markUnavailable = useCallback(() => {
    cached = { value: "unavailable", at: Date.now() };
    setState("unavailable");
  }, []);

  return { available: enabled && state === "available", markUnavailable };
}

/** Bloc affiché sous la carte active d'une cliente anonyme (sans numéro). */
export function LoyaltyAddPhone({ name, onOpen }: { name: string; onOpen: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#E7B9CD] bg-[#FFF9FB] p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="min-w-0 break-words text-sm text-[#654254]">
        <span className="font-semibold text-[#30202C]">{name}</span> n’a pas de numéro. Ajoutez-le pour la retrouver, ou
        la relier à sa fiche existante.
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex min-h-[55px] w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#981C52] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#7d1643] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#981C52] lg:min-h-11 sm:w-auto"
      >
        <PhoneForwarded size={17} aria-hidden />
        Ajouter le numéro
      </button>
    </div>
  );
}
