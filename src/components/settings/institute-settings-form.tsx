"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";

export function InstituteSettingsForm({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast();
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [addressRes, whatsappRes, websiteRes] = await Promise.all([
          fetch("/api/settings/address/", { credentials: "include" }),
          fetch("/api/settings/whatsapp-from/", { credentials: "include" }),
          fetch("/api/settings/website/", { credentials: "include" }),
        ]);

        const addressData = (await addressRes.json()) as {
          address?: string | null;
          error?: string;
        };
        const whatsappData = (await whatsappRes.json()) as {
          whatsappFrom?: string | null;
          error?: string;
        };
        const websiteData = (await websiteRes.json()) as {
          website?: string | null;
          error?: string;
        };

        if (!addressRes.ok) {
          throw new Error(addressData.error || "Impossible de charger l'adresse.");
        }
        if (!whatsappRes.ok) {
          throw new Error(whatsappData.error || "Impossible de charger le numéro.");
        }
        if (!websiteRes.ok) {
          throw new Error(websiteData.error || "Impossible de charger le site.");
        }

        if (!cancelled) {
          setAddress(addressData.address ?? "");
          setPhone(whatsappData.whatsappFrom ?? "");
          setWebsite(websiteData.website ?? "");
        }
      } catch (error) {
        if (!cancelled) {
          toast(
            error instanceof Error ? error.message : "Impossible de charger les paramètres.",
            "error",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  async function save() {
    setSaving(true);
    try {
      const [addressRes, whatsappRes, websiteRes] = await Promise.all([
        fetch("/api/settings/address/", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        }),
        fetch("/api/settings/whatsapp-from/", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ whatsappFrom: phone }),
        }),
        fetch("/api/settings/website/", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ website }),
        }),
      ]);

      const addressData = (await addressRes.json()) as {
        address?: string | null;
        error?: string;
      };
      const whatsappData = (await whatsappRes.json()) as {
        whatsappFrom?: string | null;
        error?: string;
      };
      const websiteData = (await websiteRes.json()) as {
        website?: string | null;
        error?: string;
      };

      if (!addressRes.ok) {
        throw new Error(addressData.error || "Adresse : enregistrement impossible.");
      }
      if (!whatsappRes.ok) {
        throw new Error(whatsappData.error || "WhatsApp : enregistrement impossible.");
      }
      if (!websiteRes.ok) {
        throw new Error(websiteData.error || "Site web : enregistrement impossible.");
      }

      setAddress(addressData.address ?? "");
      setPhone(whatsappData.whatsappFrom ?? "");
      setWebsite(websiteData.website ?? "");
      toast("Informations de l'institut enregistrées.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Enregistrement impossible.", "error");
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "h-11 w-full rounded-lg border border-[#F0E4EA] bg-white px-3 text-[14px] outline-none focus:border-[#C95483] disabled:text-[#887787]";

  return (
    <div className="space-y-4 sm:col-span-2">
      <div className="space-y-3 rounded-xl bg-[#FFF5F9] p-4">
        <div>
          <p className="text-[13px] font-semibold text-[#261524]">Localisation / adresse</p>
          <p className="text-[12px] text-[#887787]">
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
          className={fieldClass}
        />
      </div>

      <div className="space-y-3 rounded-xl bg-[#FFF5F9] p-4">
        <div>
          <p className="text-[13px] font-semibold text-[#261524]">
            Numéro WhatsApp de l&apos;institut
          </p>
          <p className="text-[12px] text-[#887787]">
            Les messages de cet institut partent depuis ce numéro.
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
          className={fieldClass}
        />
      </div>

      <div className="space-y-3 rounded-xl bg-[#FFF5F9] p-4">
        <div>
          <p className="text-[13px] font-semibold text-[#261524]">Site web de l&apos;institut</p>
          <p className="text-[12px] text-[#887787]">
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
          className={fieldClass}
        />
      </div>

      {canEdit ? (
        <button
          type="button"
          disabled={loading || saving}
          onClick={() => void save()}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[#A40E49] px-5 text-sm font-bold text-white shadow-md transition hover:bg-[#801035] disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      ) : (
        <p className="text-sm text-[#887787]">
          Seul le propriétaire peut modifier ces informations.
        </p>
      )}
    </div>
  );
}
