"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";

export function InstituteWhatsappField({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/whatsapp-from/", { credentials: "include" })
      .then(async (res) => {
        const data = (await res.json()) as { whatsappFrom?: string | null; error?: string };
        if (!res.ok) throw new Error(data.error || "Impossible de charger le numéro.");
        if (!cancelled) {
          setSaved(data.whatsappFrom ?? null);
          setPhone(data.whatsappFrom ?? "");
        }
      })
      .catch(() => {
        if (!cancelled) toast("Impossible de charger le numéro WhatsApp.", "error");
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
      const res = await fetch("/api/settings/whatsapp-from/", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappFrom: phone }),
      });
      const data = (await res.json()) as { whatsappFrom?: string | null; error?: string };
      if (!res.ok) throw new Error(data.error || "Enregistrement impossible.");
      setSaved(data.whatsappFrom ?? null);
      setPhone(data.whatsappFrom ?? "");
      toast(data.whatsappFrom ? "Numéro WhatsApp enregistré." : "Numéro WhatsApp retiré.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Enregistrement impossible.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl bg-[#FFEFF8] p-4 sm:col-span-2">
      <div>
        <p className="text-[13px] font-semibold text-ink">Numéro WhatsApp de l&apos;institut</p>
        <p className="text-[12px] text-ink/50">
          Les messages de cet institut partent depuis ce numéro. Chaque institut a le sien.
        </p>
      </div>
      <input
        type="tel"
        autoComplete="tel"
        maxLength={20}
        disabled={!canEdit || loading}
        value={phone}
        placeholder={loading ? "Chargement…" : "ex. 0612345678"}
        onChange={(e) => setPhone(e.target.value)}
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
        <p className="text-[13px] text-ink/55">{saved || "Aucun numéro WhatsApp enregistré."}</p>
      )}
    </div>
  );
}
