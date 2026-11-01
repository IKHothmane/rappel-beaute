"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { limitPhoneDigits } from "@/lib/validation/customer";

const input =
  "mt-1 h-11 w-full rounded-xl border border-[#F0DDE7] px-3 text-sm font-normal outline-none focus:border-[#A83E70]";

/** Inscription minimale : nom, prénom, téléphone. Le code de la carte s'affiche ensuite. */
export function LoyaltyCardProfile({ token, organizationName }: { token: string; organizationName: string }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/public/loyalty-card/profile/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, firstName, lastName, phone }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error || "Enregistrement impossible.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#F0DDE7] bg-white p-4 sm:p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9A5273]">Ma carte</p>
      <h2 className="mt-1 text-lg font-extrabold text-[#43293A]">Enregistrez votre carte</h2>
      <p className="mt-1 text-sm text-[#806B77]">
        Indiquez votre nom et votre téléphone pour recevoir votre code {organizationName}.
      </p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <label className="block text-sm font-semibold text-[#43293A]">
          Prénom
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required maxLength={80} autoComplete="given-name" className={input} />
        </label>
        <label className="block text-sm font-semibold text-[#43293A]">
          Nom
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} required maxLength={80} autoComplete="family-name" className={input} />
        </label>
        <label className="block text-sm font-semibold text-[#43293A]">
          Téléphone
          <input
            value={phone}
            onChange={(e) => setPhone(limitPhoneDigits(e.target.value))}
            required
            inputMode="tel"
            maxLength={10}
            autoComplete="tel"
            placeholder="06…"
            className={input}
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button type="submit" disabled={busy} className="h-11 w-full rounded-xl bg-[#A83E70] text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Enregistrement…" : "Enregistrer et voir mon code"}
        </button>
      </form>
    </section>
  );
}
