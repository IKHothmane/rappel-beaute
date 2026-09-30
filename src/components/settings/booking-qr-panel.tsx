"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { useToast } from "@/components/ui/toast";

type QrPayload = {
  organizationName: string;
  slug: string;
  globalUrl: string;
};

/** Compose monogramme institut au centre du PNG (pas de logo stocké en DB). */
async function pngWithCenterMonogram(dataUrl: string, letter: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const size = Math.round(img.width * 0.18);
      const x = (img.width - size) / 2;
      const y = (img.height - size) / 2;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = "#C45C7A";
      ctx.font = `600 ${Math.round(size * 0.55)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(letter.toUpperCase().slice(0, 1), img.width / 2, img.height / 2 + 1);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("QR image"));
    img.src = dataUrl;
  });
}

export function BookingQrPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<QrPayload | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/booking-qr/", { credentials: "include" });
      const body = (await res.json()) as QrPayload & { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Erreur");
      setData(body);
    } catch {
      toast("Impossible de charger les QR.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!data?.globalUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const rawPng = await QRCode.toDataURL(data.globalUrl, {
          width: 512,
          margin: 2,
          errorCorrectionLevel: "H",
        });
        const png = await pngWithCenterMonogram(rawPng, data.organizationName.charAt(0));
        if (!cancelled) setDataUrl(png);
      } catch {
        if (!cancelled) toast("Génération QR impossible.", "error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data, toast]);

  async function copyLink() {
    if (!data?.globalUrl) return;
    try {
      await navigator.clipboard.writeText(data.globalUrl);
      toast("Lien copié.", "success");
    } catch {
      toast("Copie impossible.", "error");
    }
  }

  if (loading) return <p className="text-sm text-ink/50">Chargement QR…</p>;
  if (!data) return null;

  return (
    <section className="space-y-4">
      <div>
        <p className="font-medium">QR Code réservation</p>
        <p className="text-xs text-ink/50">Cliquez sur le QR pour copier le lien de réservation.</p>
      </div>

      <button
        type="button"
        onClick={() => void copyLink()}
        className="mx-auto block max-w-xs rounded-2xl border border-line bg-white p-5 text-center transition-colors hover:border-primary/40 hover:bg-[#FFEFF8]"
        title="Copier le lien"
      >
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-primary">
          QR réservation
        </p>
        <div className="relative mx-auto h-48 w-48">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt="QR réservation" className="h-48 w-48" />
          ) : (
            <div className="flex h-48 w-48 items-center justify-center text-xs text-ink/40">…</div>
          )}
        </div>
        <p className="mt-3 text-sm font-medium">{data.organizationName}</p>
        <p className="text-xs text-ink/50">Scannez pour réserver</p>
      </button>
    </section>
  );
}
