"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function LoyaltyPassQr({ customerId }: { customerId: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setQr(null);
    setError(null);
    void (async () => {
      try {
        const res = await fetch("/api/loyalty/cards/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId }),
        });
        const body = (await res.json()) as { cardUrl?: string; error?: string };
        if (!res.ok || !body.cardUrl) throw new Error(body.error || "Carte indisponible.");
        const url = new URL(body.cardUrl);
        if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
          url.protocol = window.location.protocol;
          url.host = window.location.host;
        }
        url.pathname = `${url.pathname.replace(/\/$/, "")}/google/`;
        const image = await QRCode.toDataURL(url.toString(), {
          margin: 1,
          width: 280,
          errorCorrectionLevel: "M",
        });
        if (!cancelled) setQr(image);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Carte indisponible.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  return (
    <div className="rounded-xl border border-line bg-white p-4 text-center">
      <p className="text-[11px] font-bold uppercase tracking-wider text-primary">QR à scanner</p>
      <p className="mt-1 text-[13px] text-ink/60">
        La cliente scanne ce code. Un iPhone l&apos;ajoute à Apple Wallet, un Android à Google Wallet.
      </p>
      {error ? <p className="mt-3 text-[13px] font-semibold text-primary">{error}</p> : null}
      {qr ? (
        <div className="mt-3 inline-block rounded-xl border border-line bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code à scanner" width={220} height={220} className="h-52 w-52" />
        </div>
      ) : !error ? (
        <p className="mt-3 text-[13px] text-ink/45">Préparation du QR…</p>
      ) : null}
    </div>
  );
}
