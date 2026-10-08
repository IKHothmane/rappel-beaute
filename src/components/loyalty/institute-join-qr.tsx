"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { SITE } from "@/lib/site";
import { useToast } from "@/components/ui/toast";

type JoinQr = {
  token: string;
  organizationName: string;
  programName: string;
  visitsPerReward: number;
  rewardLabel: string;
};

function publicJoinUrl(token: string) {
  const origin =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? window.location.origin
      : SITE.url;
  return `${origin.replace(/\/$/, "")}/carte/rejoindre/${token}/`;
}

export function InstituteJoinQr({ canWrite }: { canWrite: boolean }) {
  const { toast } = useToast();
  const [qr, setQr] = useState<JoinQr | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/loyalty/join-qr/", { credentials: "include" })
      .then((res) => res.json())
      .then((data: { qr?: JoinQr | null }) => {
        if (!cancelled) setQr(data.qr ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!qr) {
      setImage(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(publicJoinUrl(qr.token), { margin: 1, width: 480, errorCorrectionLevel: "M" })
      .then((url) => {
        if (!cancelled) setImage(url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [qr]);

  async function run(action: "regenerate" | "revoke") {
    setBusy(true);
    try {
      const res = await fetch("/api/loyalty/join-qr/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { qr?: JoinQr | null; error?: string };
      if (!res.ok) throw new Error(data.error || "Action impossible.");
      setQr(data.qr ?? null);
      toast(action === "revoke" ? "Ancien QR désactivé." : "QR de l'institut prêt.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Action impossible.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function downloadSvg() {
    if (!qr) return;
    const svg = await QRCode.toString(publicJoinUrl(qr.token), { type: "svg", margin: 1 });
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "fidelite-institut.svg";
    link.click();
    URL.revokeObjectURL(href);
  }

  function printCard() {
    if (!image || !qr) return;
    const popup = window.open("", "_blank", "noopener,noreferrer,width=480,height=640");
    if (!popup) return;
    popup.document.write(`<!doctype html><title>QR fidélité</title>
      <body style="font-family:sans-serif;text-align:center;padding:32px">
        <img src="${image}" alt="QR" width="280" height="280" />
        <h1 style="font-size:22px;margin:12px 0 4px">${qr.organizationName}</h1>
        <p>Scannez pour rejoindre notre fidélité</p>
      </body>`);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-xl bg-[#FFEFF8]">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="QR fidélité de l'institut" className="h-32 w-32" />
          ) : (
            <p className="px-3 text-center text-xs text-ink/45">Aucun QR actif</p>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">QR de l&apos;institut</p>
          <h3 className="mt-1 text-[18px] font-bold text-ink">{qr?.programName || "Carte de fidélité"}</h3>
          <p className="mt-1 text-[13px] text-ink/55">
            Scannez pour rejoindre. Ce QR ne donne jamais un passage.
          </p>
          {canWrite ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void run("regenerate")}
                className="h-9 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white disabled:opacity-50"
              >
                {qr ? "Régénérer" : "Générer le QR"}
              </button>
              {image ? (
                <a
                  href={image}
                  download="fidelite-institut.png"
                  className="inline-flex h-9 items-center rounded-lg bg-[#FCE9F4] px-3 text-[12px] font-semibold"
                >
                  PNG
                </a>
              ) : null}
              {qr ? (
                <button
                  type="button"
                  onClick={() => void downloadSvg()}
                  className="h-9 rounded-lg bg-[#FCE9F4] px-3 text-[12px] font-semibold"
                >
                  SVG
                </button>
              ) : null}
              {qr ? (
                <button
                  type="button"
                  onClick={printCard}
                  className="h-9 rounded-lg bg-[#FCE9F4] px-3 text-[12px] font-semibold"
                >
                  Imprimer
                </button>
              ) : null}
              {qr ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run("revoke")}
                  className="h-9 rounded-lg px-3 text-[12px] font-semibold text-ink/55"
                >
                  Désactiver
                </button>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-[12px] text-ink/45">Seul le responsable peut générer ce QR.</p>
          )}
        </div>
      </div>
    </section>
  );
}
