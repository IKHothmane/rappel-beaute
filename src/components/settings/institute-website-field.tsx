"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";

export function InstituteWebsiteField({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast();
  const [website, setWebsite] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/website/", { credentials: "include" })
      .then(async (res) => {
        const data = (await res.json()) as { website?: string | null; error?: string };
        if (!res.ok) throw new Error(data.error || "Impossible de charger le site.");
        if (!cancelled) {
          setSaved(data.website ?? null);
          setWebsite(data.website ?? "");
        }
      })
      .catch(() => {
        if (!cancelled) toast("Impossible de charger le site web.", "error");
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
      const res = await fetch("/api/settings/website/", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website }),
      });
      const data = (await res.json()) as { website?: string | null; error?: string };
      if (!res.ok) throw new Error(data.error || "Enregistrement impossible.");
      setSaved(data.website ?? null);
      setWebsite(data.website ?? "");
      toast(data.website ? "Site web enregistré." : "Site web retiré.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Enregistrement impossible.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl bg-[#FFEFF8] p-4">
      <div>
        <p className="text-[13px] font-semibold text-ink">Site web de l&apos;institut</p>
        <p className="text-[12px] text-ink/50">
          Facultatif. Laissez vide si l&apos;institut n&apos;a pas de site.
        </p>
      </div>
      <input
        type="url"
        inputMode="url"
        autoComplete="url"
        maxLength={200}
        disabled={!canEdit || loading}
        value={website}
        placeholder={loading ? "Chargement…" : "https://"}
        onChange={(e) => setWebsite(e.target.value)}
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
        <p className="text-[13px] text-ink/55">{saved || "Aucun site enregistré."}</p>
      )}
    </div>
  );
}
