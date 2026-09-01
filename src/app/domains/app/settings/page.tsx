"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppPageHeader, Tabs } from "@/components/app/AppUi";
import { useCurrentUser } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { canManageReviewSettings } from "@/lib/rbac";
import { getReviewSettings, updateReviewSettings } from "@/modules/reviews/service";

const TABS = [
  "Institut",
  "Horaires",
  "Communication",
  "Réservation",
  "Paiements",
  "Facturation",
  "Notifications",
  "Abonnement",
];

function CommunicationReviewSettings() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canEdit = canManageReviewSettings(user.role);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");
  const [delayHours, setDelayHours] = useState("3");
  const [enabled, setEnabled] = useState(true);

  const load = useCallback(async () => {
    try {
      const s = await getReviewSettings();
      setGoogleReviewUrl(s.googleReviewUrl ?? "");
      setDelayHours(String(s.delayHours));
      setEnabled(s.enabled);
    } catch {
      toast("Impossible de charger les paramètres avis.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  async function handleSave() {
    if (!canEdit) return;
    setSubmitting(true);
    const result = await updateReviewSettings({
      googleReviewUrl: googleReviewUrl.trim() || null,
      delayHours: Number(delayHours) || 3,
      enabled,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Paramètres avis enregistrés.", "success");
  }

  if (loading) {
    return <p className="text-sm text-ink/50">Chargement…</p>;
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <p className="font-medium">Demandes d&apos;avis Google</p>
        <p className="text-xs text-ink/50">
          Après un rendez-vous terminé, une demande WhatsApp est préparée automatiquement.
          Seul le lien Google que vous configurez ici sera inclus dans le message.
        </p>

        <label className="block space-y-1.5 text-sm">
          <span>Lien Google Review</span>
          <Input
            type="url"
            placeholder="https://g.page/r/…/review"
            value={googleReviewUrl}
            onChange={(e) => setGoogleReviewUrl(e.target.value)}
            disabled={!canEdit}
          />
          <span className="text-xs text-ink/45">
            Collez l&apos;URL de votre fiche Google (bouton « Laisser un avis »).
          </span>
        </label>

        <label className="block space-y-1.5 text-sm">
          <span>Délai après rendez-vous (heures)</span>
          <Input
            type="number"
            min={1}
            max={72}
            value={delayHours}
            onChange={(e) => setDelayHours(e.target.value)}
            disabled={!canEdit}
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            disabled={!canEdit}
            className="size-4 rounded border-line"
          />
          Activer les demandes d&apos;avis automatiques
        </label>

        <p className="text-xs text-ink/45">
          Modèle WhatsApp : type « Review Request » — modifiable dans{" "}
          <Link href="/whatsapp/" className="text-primary underline">
            WhatsApp → Modèles
          </Link>
          . Variable :{" "}
          <code className="rounded bg-ink/[0.04] px-1">{"{{organization.googleReviewUrl}}"}</code>
        </p>

        {canEdit ? (
          <Button disabled={submitting} onClick={handleSave}>
            Enregistrer
          </Button>
        ) : (
          <p className="text-xs text-ink/45">Lecture seule pour votre rôle.</p>
        )}
      </section>
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState("Institut");

  if (tab === "Abonnement") {
    return (
      <>
        <AppPageHeader title="Paramètres" description="Configuration de l'institut." />
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
        <div className="mt-4">
          <Link href="/settings/subscription/" className="text-sm text-primary underline">
            Voir votre abonnement, limites et fonctionnalités →
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <AppPageHeader title="Paramètres" description="Configuration de l'institut." />
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      <div className="surface max-w-xl space-y-3 p-5 text-sm">
        {tab === "Communication" ? (
          <CommunicationReviewSettings />
        ) : (
          <>
            <p className="font-medium">Onglet « {tab} »</p>
            <input
              className="w-full rounded-lg border border-line px-3 py-2.5 outline-none focus:border-primary"
              placeholder="Valeur de démonstration"
              defaultValue={tab === "Institut" ? "Institut Royal" : ""}
            />
            <button type="button" className="btn-primary">
              Enregistrer (démo)
            </button>
          </>
        )}
      </div>
    </>
  );
}
