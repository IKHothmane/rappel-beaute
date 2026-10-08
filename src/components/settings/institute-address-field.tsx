"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";

export function InstituteAddressField({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast();
  const [address, setAddress] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/address/", { credentials: "include" })
      .then(async (res) => {
        const data = (await res.json()) as { address?: string | null; error?: string };
        if (!res.ok) throw new Error(data.error || "Impossible de charger l'adresse.");
        if (!cancelled) {
          setSaved(data.address ?? null);
          setAddress(data.address ?? "");
        }
      })
      .catch(() => {
        if (!cancelled) toast("Impossible de charger l'adresse.", "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/address/", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = (await res.json()) as { address?: string | null; error?: string };
      if (!res.ok) throw new Error(data.error || "Enregistrement impossible.");
      setSaved(data.address ?? null);
      setAddress(data.address ?? "");
      toast(data.address ? "Adresse enregistrée." : "Adresse retirée.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Enregistrement impossible.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl bg-[#FFEFF8] p-4 sm:col-span-2">
      <div>
        <p className="text-[13px] font-semibold text-ink">Localisation / adresse</p>
        <p className="text-[12px] text-ink/50">
          Facultatif. Adresse de l&apos;institut, utilisée dans l&apos;application.
        </p>
      </div>
      <input
        type="text"
        autoComplete="street-address"
        maxLength={200}
        disabled={!canEdit || loading}
        value={address}
        placeholder={loading ? "Chargement…" : "ex. Bd Anfa, Maarif, Casablanca"}
        onChange={(e) => setAddress(e.target.value)}
        className="h-11 w-full rounded-lg border border-line bg-white px-3 text-[14px] outline-none focus:border-primary disabled:text-ink/45"
      />
      {canEdit ? (
        <button
          type="button"
          disabled={loading || saving}
          onClick={() => void save()}
          className="h-10 rounded-lg bg-primary px-4 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      ) : (
        <p className="text-[13px] text-ink/55">{saved || "Aucune adresse enregistrée."}</p>
      )}
    </div>
  );
}
