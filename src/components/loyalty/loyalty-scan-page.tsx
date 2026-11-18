"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Gift, Plus } from "lucide-react";

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
  visits: number;
  promoCode: string | null;
  validatedAt: string;
};

type ScanState =
  | { kind: "idle" | "reading" }
  | { kind: "pending" | "confirming"; preview: Preview }
  | { kind: "error"; message: string; preview?: Preview }
  | { kind: "success"; result: Confirmation };

class ScanError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
  }
}

async function scanRequest<T>(details: { action: "scan"; token: string } | { action: "confirm"; validationId: string }): Promise<T> {
  const response = await fetch("/api/loyalty/scan/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(details),
  });
  const data = (await response.json()) as T & { error?: string; code?: string };
  if (!response.ok) throw new ScanError(data.error || "La demande a échoué.", response.status, data.code);
  return data;
}

async function createQrDetector() {
  const Native = (
    window as unknown as {
      BarcodeDetector?: new (opts: { formats: string[] }) => {
        detect: (source: HTMLVideoElement) => Promise<{ rawValue?: string }[]>;
      };
    }
  ).BarcodeDetector;
  if (Native) {
    try {
      return new Native({ formats: ["qr_code"] });
    } catch {
      // Certains navigateurs exposent BarcodeDetector sans prendre en charge les QR.
    }
  }
  const mod = await import("barcode-detector/ponyfill");
  return new mod.BarcodeDetector({ formats: ["qr_code"] });
}

const primaryButton = "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#981C52] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#7d1643] disabled:opacity-50";

export function LoyaltyScanPage({
  onIdentified,
  onConfirmed,
}: {
  onIdentified: (customerId: string) => void;
  onConfirmed: (customerId: string) => void;
}) {
  const [state, setState] = useState<ScanState>({ kind: "idle" });
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const confirmationInFlight = useRef(false);
  const onScanRef = useRef<(token: string) => void>(() => {});
  const preview = "preview" in state ? state.preview : undefined;

  async function identify(token: string) {
    setCameraOn(false);
    setState({ kind: "reading" });
    try {
      const customer = await scanRequest<Preview>({ action: "scan", token });
      setState({ kind: "pending", preview: customer });
      onIdentified(customer.customerId);
    } catch (error) {
      setState({ kind: "error", message: error instanceof ScanError ? error.message : "Impossible de lire la carte. Réessayez." });
    }
  }

  onScanRef.current = (token) => void identify(token);

  async function confirm(customer: Preview) {
    if (confirmationInFlight.current) return;
    confirmationInFlight.current = true;
    setState({ kind: "confirming", preview: customer });
    try {
      const result = await scanRequest<Confirmation>({ action: "confirm", validationId: customer.validationId });
      setState({ kind: "success", result });
      onConfirmed(result.customerId);
    } catch (error) {
      const duplicate = error instanceof ScanError && error.code === "ALREADY_VALIDATED";
      const canRetry = !(error instanceof ScanError) || error.status >= 500;
      setState({
        kind: "error",
        message: error instanceof ScanError ? error.message : "Impossible de vérifier la confirmation. Réessayez.",
        preview: canRetry ? customer : undefined,
      });
      if (duplicate) onConfirmed(customer.customerId);
    } finally {
      confirmationInFlight.current = false;
    }
  }

  useEffect(() => {
    if (state.kind === "pending") confirmRef.current?.focus();
  }, [state.kind]);

  useEffect(() => {
    if (!cameraOn) return;
    const video = videoRef.current;
    if (!video) return;
    let stopped = false;
    let stream: MediaStream | null = null;
    let frame = 0;
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();
        const detector = await createQrDetector();
        const tick = async () => {
          if (stopped) return;
          const codes = await detector.detect(video).catch(() => []);
          if (stopped) return;
          const token = codes[0]?.rawValue;
          if (token) {
            onScanRef.current(token);
            return;
          }
          frame = window.requestAnimationFrame(() => void tick());
        };
        void tick();
      } catch {
        if (stopped) return;
        setCameraOn(false);
        setState({ kind: "error", message: "Caméra indisponible. Vérifiez les autorisations de votre navigateur." });
      }
    })();
    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    };
  }, [cameraOn]);

  function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState({ kind: "error", message: "Caméra indisponible sur cet appareil ou dans ce navigateur." });
      return;
    }
    setState({ kind: "idle" });
    setCameraOn(true);
  }

  return (
    <section className="rounded-[26px] border border-[#F1E8EC] bg-white p-5 shadow-sm" aria-labelledby="loyalty-scan-title">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF1F6] text-[#981C52]">
          <Camera size={22} aria-hidden />
        </span>
        <h2 id="loyalty-scan-title" className="text-base font-bold text-[#30202C]">Scanner la carte cliente</h2>
      </div>

      {cameraOn && (
        <div className="mt-4 space-y-3">
          <p role="status" className="text-sm text-[#765E6B]">Placez le QR de la carte devant la caméra.</p>
          <video ref={videoRef} className="aspect-video w-full rounded-xl bg-black object-cover" muted playsInline autoPlay />
          <button type="button" onClick={() => setCameraOn(false)} className="min-h-11 w-full rounded-xl border border-[#E7B9CD] text-sm font-semibold text-[#981C52]">
            Fermer la caméra
          </button>
        </div>
      )}
      {state.kind === "reading" && (
        <p role="status" className="mt-4 text-sm font-semibold text-[#765E6B]">Lecture de la carte…</p>
      )}
      {state.kind === "error" && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800">{state.message}</p>
      )}
      {preview && (
        <div className="mt-4 space-y-4">
          <div className="space-y-3 rounded-2xl bg-[#FCF7F9] p-4 text-[#30202C]">
            <div>
              <p role="status" className="text-xs font-semibold text-[#765E6B]">
                {state.kind === "confirming" ? "Enregistrement du passage…" : "Cliente identifiée · En attente de confirmation"}
              </p>
              <p className="mt-1 text-base font-bold">{preview.customerName}</p>
              <p className="text-sm text-[#765E6B]">{preview.card.organizationName}</p>
            </div>
            <div className="border-t border-[#F0DDE6] pt-3">
              <p className="text-sm font-semibold">Progression fidélité</p>
              <p className="mt-1 text-2xl font-bold text-[#981C52]">{preview.card.cycle} / {preview.card.visitsPerReward}</p>
              <p className="mt-1 text-sm text-[#765E6B]">
                {preview.card.visits} {preview.card.visits === 1 ? "passage enregistré" : "passages enregistrés"}
              </p>
              <p className="mt-2 flex items-start gap-2 text-sm">
                <Gift size={16} className="mt-0.5 shrink-0 text-[#981C52]" aria-hidden />
                <span>Encore {preview.card.remaining} {preview.card.remaining === 1 ? "passage" : "passages"} · {preview.card.rewardLabel}</span>
              </p>
            </div>
          </div>
          <button
            ref={confirmRef}
            type="button"
            disabled={state.kind === "confirming"}
            onClick={() => void confirm(preview)}
            className={primaryButton}
          >
            <Plus size={18} aria-hidden />
            {state.kind === "confirming" ? "Confirmation…" : "Confirmer +1 passage"}
          </button>
          <button type="button" disabled={state.kind === "confirming"} onClick={() => setState({ kind: "idle" })} className="min-h-11 w-full rounded-xl border border-[#E7B9CD] text-sm font-semibold text-[#981C52] disabled:opacity-50">
            Annuler
          </button>
        </div>
      )}
      {state.kind === "success" && (
        <div role="status" className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="shrink-0" aria-hidden />
          <div>
            <p className="font-bold">Passage enregistré</p>
            <p>{state.result.customerName} · {state.result.cycle} / {state.result.visitsPerReward}</p>
            <p>
              Dernier passage {new Date(state.result.validatedAt).toLocaleString("fr-FR", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Africa/Casablanca",
              })}
            </p>
            {state.result.promoCode && <p>Code promo {state.result.promoCode} activé</p>}
          </div>
        </div>
      )}
      {!cameraOn && !preview && state.kind !== "reading" && (
        <button type="button" onClick={startCamera} className={`mt-4 ${primaryButton}`}>
          <Camera size={18} aria-hidden />
          {state.kind === "success" ? "Scanner une autre carte" : "Ouvrir la caméra"}
        </button>
      )}
    </section>
  );
}
