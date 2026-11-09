"use client";

import { useEffect, useState } from "react";
import ProfessionalAccessPage, {
  type ProfessionalCredentials,
  type ProfessionalFormData,
} from "@/components/professional/ProfessionalAccessPage";
import { CITIES } from "@/lib/site";

export function ProfessionnelRequest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<ProfessionalCredentials | null>(null);

  useEffect(() => {
    if (!credentials) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [credentials]);

  async function handleSubmit(data: ProfessionalFormData) {
    setError(null);
    if (!data.city) {
      setError("Sélectionnez votre ville.");
      return;
    }

    setLoading(true);
    try {
      const body = new FormData();
      body.set("name", data.fullName);
      body.set("institut", data.instituteName);
      body.set("ville", data.city);
      body.set("phone", data.whatsapp);
      if (data.noWebsite) body.set("no_website", "1");
      else if (data.website) body.set("website", data.website);
      if (data.needs) body.set("message", data.needs);

      const res = await fetch("/api/public/signup/", { method: "POST", body });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        credentials?: ProfessionalCredentials;
      };

      if (!res.ok) {
        setError(payload.error || "Impossible de créer le compte. Réessayez.");
        return;
      }
      if (!payload.credentials?.identifier || !payload.credentials.temporaryPassword) {
        setError(
          "Votre compte a été créé, mais les accès n’ont pas pu être affichés. Contactez notre équipe avant de réessayer.",
        );
        return;
      }
      setCredentials(payload.credentials);
    } catch {
      setError("Réseau indisponible. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProfessionalAccessPage
      cities={CITIES}
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      credentials={credentials}
    />
  );
}
