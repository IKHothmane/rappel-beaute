"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
type QrPayload = {
  organizationName: string;
  slug: string;
  globalUrl: string;
  services: { id: string; name: string; slug: string; url: string }[];
  staff: { id: string; name: string; slug: string; url: string }[];
  stats: { views: number; bookings: number; conversionPct: number | null };
};

type Mode = "global" | "service" | "staff";

/** Compose monogramme institut au centre du PNG (pas de logo stocké en DB). */
async function pngWithCenterMonogram(
  dataUrl: string,
  letter: string,
): Promise<string> {
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
  const [mode, setMode] = useState<Mode>("global");
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/booking-qr/", { credentials: "include" });
      const body = (await res.json()) as QrPayload & { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Erreur");
      setData(body);
      if (body.services[0]) setServiceId(body.services[0].id);
      if (body.staff[0]) setStaffId(body.staff[0].id);
    } catch {
      toast("Impossible de charger les QR.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const activeUrl = useMemo(() => {
    if (!data) return "";
    if (mode === "global") return data.globalUrl;
    if (mode === "service") {
      const s = data.services.find((x) => x.id === serviceId);
      return s?.url ?? data.globalUrl;
    }
    const st = data.staff.find((x) => x.id === staffId);
    return st?.url ?? data.globalUrl;
  }, [data, mode, serviceId, staffId]);

  const subtitle = useMemo(() => {
    if (!data) return "Scannez pour réserver";
    if (mode === "service") {
      const s = data.services.find((x) => x.id === serviceId);
      return s ? `Réserver — ${s.name}` : "Scannez pour réserver";
    }
    if (mode === "staff") {
      const st = data.staff.find((x) => x.id === staffId);
      return st ? `Avec ${st.name}` : "Scannez pour réserver";
    }
    return "Scannez pour réserver";
  }, [data, mode, serviceId, staffId]);

  useEffect(() => {
    if (!activeUrl || !data) return;
    let cancelled = false;
    (async () => {
      try {
        const rawPng = await QRCode.toDataURL(activeUrl, {
          width: 512,
          margin: 2,
          errorCorrectionLevel: "H",
        });
        const png = await pngWithCenterMonogram(rawPng, data.organizationName.charAt(0));
        const svg = await QRCode.toString(activeUrl, {
          type: "svg",
          margin: 2,
          errorCorrectionLevel: "H",
        });
        if (!cancelled) {
          setDataUrl(png);
          setSvgMarkup(svg);
        }
      } catch {
        if (!cancelled) toast("Génération QR impossible.", "error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeUrl, data, toast]);

  function downloadPng() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-reservation-${data?.slug ?? "institut"}.png`;
    a.click();
  }

  function downloadSvg() {
    if (!svgMarkup) return;
    const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-reservation-${data?.slug ?? "institut"}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(activeUrl);
      toast("Lien copié.", "success");
    } catch {
      toast("Copie impossible.", "error");
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Réserver — ${data?.organizationName ?? "Institut"}`,
          text: subtitle,
          url: activeUrl,
        });
        return;
      } catch {
        /* fallback */
      }
    }
    await copyLink();
  }

  if (loading) return <p className="text-sm text-ink/50">Chargement QR…</p>;
  if (!data) return null;

  return (
    <section className="space-y-4 border-b border-line pb-6">
      <div>
        <p className="font-medium">QR Code réservation</p>
        <p className="text-xs text-ink/50">
          Généré à la demande — aucune image en base. Lien :{" "}
          <code className="break-all rounded bg-ink/[0.04] px-1 text-[10px]">{activeUrl}</code>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["global", "Institut"],
            ["service", "Service"],
            ["staff", "Employée"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setMode(k)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              mode === k
                ? "border-primary bg-primary-light text-primary-dark"
                : "border-line bg-white text-ink/60"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "service" ? (
        <select
          className="w-full rounded-lg border border-line px-3 py-2 text-sm"
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
        >
          {data.services.length === 0 ? (
            <option value="">Aucun service actif</option>
          ) : (
            data.services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))
          )}
        </select>
      ) : null}

      {mode === "staff" ? (
        <select
          className="w-full rounded-lg border border-line px-3 py-2 text-sm"
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
        >
          {data.staff.length === 0 ? (
            <option value="">Aucune employée</option>
          ) : (
            data.staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))
          )}
        </select>
      ) : null}

      <div className="mx-auto max-w-xs rounded-2xl border border-line bg-white p-5 text-center">
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
        <p className="text-xs text-ink/50">{subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button type="button" variant="secondary" onClick={downloadPng}>
          Télécharger PNG
        </Button>
        <Button type="button" variant="secondary" onClick={downloadSvg}>
          Télécharger SVG
        </Button>
        <Button type="button" variant="secondary" onClick={copyLink}>
          Copier le lien
        </Button>
        <Button type="button" variant="secondary" onClick={share}>
          Partager
        </Button>
      </div>

      <div className="rounded-xl bg-[#FBF4F6] px-4 py-3 text-xs text-ink/70">
        <p className="font-medium">Stats QR (source=qr — données réelles)</p>
        <p className="mt-1">
          Vues : {data.stats.views} · Réservations : {data.stats.bookings}
          {data.stats.conversionPct != null
            ? ` · Conversion : ${data.stats.conversionPct} %`
            : ""}
        </p>
        <p className="mt-1 text-[10px] text-ink/45">
          Aucun chiffre inventé : seuls les événements enregistrés sont affichés.
        </p>
      </div>
    </section>
  );
}
