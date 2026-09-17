"use client";

import { useEffect, useRef, useState } from "react";

type OsmMapPickerProps = {
  open: boolean;
  onClose: () => void;
  onPick: (payload: {
    address: string;
    latitude: number;
    longitude: number;
    mapsUrl: string;
  }) => void;
  initialLat?: number;
  initialLng?: number;
};

type LeafletMap = {
  setView: (latlng: [number, number], zoom: number) => void;
  on: (event: string, handler: (e: { latlng: { lat: number; lng: number } }) => void) => void;
  remove: () => void;
  invalidateSize: () => void;
};

type LeafletMarker = {
  setLatLng: (latlng: [number, number]) => void;
  remove: () => void;
};

type LeafletNs = {
  map: (el: HTMLElement) => LeafletMap & { addLayer: (layer: unknown) => void };
  tileLayer: (
    url: string,
    opts: { attribution: string; maxZoom: number },
  ) => { addTo: (map: LeafletMap) => void };
  marker: (latlng: [number, number]) => LeafletMarker & { addTo: (map: LeafletMap) => LeafletMarker };
};

declare global {
  interface Window {
    L?: LeafletNs;
  }
}

const DEFAULT_CENTER: [number, number] = [33.5731, -7.5898]; // Casablanca
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

function loadLeaflet(): Promise<LeafletNs> {
  return new Promise((resolve, reject) => {
    if (window.L) {
      resolve(window.L);
      return;
    }

    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }

    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.L) resolve(window.L);
        else reject(new Error("Leaflet load failed"));
      });
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => {
      if (window.L) resolve(window.L);
      else reject(new Error("Leaflet load failed"));
    };
    script.onerror = () => reject(new Error("Leaflet load failed"));
    document.head.appendChild(script);
  });
}

export function OsmMapPicker({
  open,
  onClose,
  onPick,
  initialLat,
  initialLng,
}: OsmMapPickerProps) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const [pending, setPending] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingAddr, setLoadingAddr] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    (async () => {
      try {
        const L = await loadLeaflet();
        if (cancelled || !mapElRef.current) return;

        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
          markerRef.current = null;
        }

        const center: [number, number] =
          initialLat != null && initialLng != null
            ? [initialLat, initialLng]
            : DEFAULT_CENTER;

        const map = L.map(mapElRef.current);
        map.setView(center, initialLat != null ? 16 : 12);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        map.on("click", (e) => {
          const { lat, lng } = e.latlng;
          setPending({ lat, lng });
          setError(null);
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            markerRef.current = L.marker([lat, lng]).addTo(map);
          }
        });

        mapRef.current = map;
        window.setTimeout(() => map.invalidateSize(), 80);
      } catch {
        if (!cancelled) setError("Impossible de charger la carte OpenStreetMap.");
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [open, initialLat, initialLng]);

  async function confirmPick() {
    if (!pending) {
      setError("Cliquez sur la carte pour placer votre institut.");
      return;
    }

    setLoadingAddr(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/geo/locate?lat=${encodeURIComponent(String(pending.lat))}&lon=${encodeURIComponent(String(pending.lng))}`,
      );
      const data = (await res.json()) as { address?: string };
      const address =
        data.address ??
        `Lat ${pending.lat.toFixed(5)}, Lng ${pending.lng.toFixed(5)}`;
      const mapsUrl = `https://www.openstreetmap.org/?mlat=${pending.lat}&mlon=${pending.lng}#map=17/${pending.lat}/${pending.lng}`;

      onPick({
        address,
        latitude: pending.lat,
        longitude: pending.lng,
        mapsUrl,
      });
      onClose();
    } catch {
      setError("Impossible de récupérer l'adresse. Réessayez.");
    } finally {
      setLoadingAddr(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choisir une position sur OpenStreetMap"
        className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <p className="text-sm font-bold text-ink">Choisir sur la carte</p>
            <p className="text-xs text-ink/50">Cliquez sur votre emplacement (OpenStreetMap)</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-medium text-ink/60 hover:bg-paper hover:text-ink"
          >
            Fermer
          </button>
        </div>

        <div ref={mapElRef} className="h-[320px] w-full bg-[#eef2f5] sm:h-[380px]" />

        <div className="flex flex-col gap-2 border-t border-line px-4 py-3">
          {pending ? (
            <p className="text-xs text-ink/55">
              Point sélectionné : {pending.lat.toFixed(5)}, {pending.lng.toFixed(5)}
            </p>
          ) : (
            <p className="text-xs text-ink/45">Aucun point sélectionné pour l’instant.</p>
          )}
          {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
          <button
            type="button"
            disabled={loadingAddr || !pending}
            onClick={confirmPick}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white transition hover:bg-primary-dark disabled:opacity-60"
          >
            {loadingAddr ? "Récupération de l'adresse…" : "Utiliser cette position"}
          </button>
        </div>
      </div>
    </div>
  );
}
