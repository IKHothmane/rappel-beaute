"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppPageHeader, Tabs } from "@/components/app/AppUi";
import { useCurrentUser } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { canManageReviewSettings, canWriteFeatureLimited } from "@/lib/rbac";
import { getReviewSettings, updateReviewSettings } from "@/modules/reviews/service";
import {
  getBookingPolicy,
  updateBookingPolicyApi,
} from "@/modules/booking-policy/service";
import { BookingQrPanel } from "@/components/settings/booking-qr-panel";
import {
  getPostVisitSettings,
  updatePostVisitSettingsSettingsApi,
} from "@/modules/post-visit/service";
import type {
  DepositDefaultMode,
  DepositRetentionPolicy,
} from "@/types/booking-policy";

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
          .
        </p>

        {canEdit ? (
          <Button disabled={submitting} onClick={handleSave}>
            Enregistrer
          </Button>
        ) : (
          <p className="text-xs text-ink/45">Lecture seule pour votre rôle.</p>
        )}
      </section>

      <PostVisitSettingsForm />
    </div>
  );
}

function PostVisitSettingsForm() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canEdit = canWriteFeatureLimited(user.role, "settings");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [defaultReturnDays, setDefaultReturnDays] = useState("30");
  const [minimumDays, setMinimumDays] = useState("30");
  const [respectFuture, setRespectFuture] = useState(true);
  const [respectOptIn, setRespectOptIn] = useState(true);
  const [autoCreate, setAutoCreate] = useState(true);

  const load = useCallback(async () => {
    try {
      const s = await getPostVisitSettings();
      setEnabled(s.enabled);
      setDefaultReturnDays(String(s.defaultReturnDays));
      setMinimumDays(String(s.minimumDaysBetweenMarketingMessages));
      setRespectFuture(s.respectFutureAppointments);
      setRespectOptIn(s.respectOptIn);
      setAutoCreate(s.autoCreateWhatsAppTasks);
    } catch {
      toast("Impossible de charger les relances post-prestation.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  async function handleSave() {
    if (!canEdit) return;
    setSubmitting(true);
    const result = await updatePostVisitSettingsSettingsApi({
      enabled,
      defaultReturnDays: Number(defaultReturnDays) || 30,
      minimumDaysBetweenMarketingMessages: Number(minimumDays) || 30,
      respectFutureAppointments: respectFuture,
      respectOptIn,
      autoCreateWhatsAppTasks: autoCreate,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Paramètres post-prestation enregistrés.", "success");
  }

  if (loading) return <p className="text-sm text-ink/50">Chargement post-prestation…</p>;

  return (
    <section className="space-y-3 border-t border-line pt-6">
      <p className="font-medium">Relances post-prestation</p>
      <p className="text-xs text-ink/50">
        Distinct de la réactivation. Priorité : délai service → délai institut (
        {defaultReturnDays} j) → 30 j.
      </p>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          disabled={!canEdit}
          className="size-4 rounded border-line"
        />
        Activer les relances post-prestation
      </label>

      <label className="block space-y-1.5 text-sm">
        <span>Délai institut par défaut (jours)</span>
        <Input
          type="number"
          min={1}
          max={365}
          value={defaultReturnDays}
          onChange={(e) => setDefaultReturnDays(e.target.value)}
          disabled={!canEdit}
        />
      </label>

      <label className="block space-y-1.5 text-sm">
        <span>Délai minimum marketing (jours)</span>
        <Input
          type="number"
          min={1}
          max={180}
          value={minimumDays}
          onChange={(e) => setMinimumDays(e.target.value)}
          disabled={!canEdit}
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={respectFuture}
          onChange={(e) => setRespectFuture(e.target.checked)}
          disabled={!canEdit}
          className="size-4 rounded border-line"
        />
        Respecter les RDV futurs
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={respectOptIn}
          onChange={(e) => setRespectOptIn(e.target.checked)}
          disabled={!canEdit}
          className="size-4 rounded border-line"
        />
        Respecter l&apos;opt-in WhatsApp
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={autoCreate}
          onChange={(e) => setAutoCreate(e.target.checked)}
          disabled={!canEdit}
          className="size-4 rounded border-line"
        />
        Créer automatiquement les tâches WhatsApp
      </label>

      <p className="text-xs text-ink/45">
        Liste :{" "}
        <Link href="/post-visit/" className="text-primary underline">
          Marketing → Post-prestation
        </Link>
      </p>

      {canEdit ? (
        <Button disabled={submitting} onClick={handleSave}>
          Enregistrer
        </Button>
      ) : (
        <p className="text-xs text-ink/45">Lecture seule pour votre rôle.</p>
      )}
    </section>
  );
}

function BookingPolicySettingsForm() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canEdit = canWriteFeatureLimited(user.role, "settings");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [depositsEnabled, setDepositsEnabled] = useState(false);
  const [defaultMode, setDefaultMode] = useState<DepositDefaultMode>("NONE");
  const [defaultFixedAmount, setDefaultFixedAmount] = useState("");
  const [defaultPercent, setDefaultPercent] = useState("");
  const [confirmDeadlineHours, setConfirmDeadlineHours] = useState("24");
  const [lateCancelHours, setLateCancelHours] = useState("24");
  const [onCustomerLateCancel, setOnCustomerLateCancel] =
    useState<DepositRetentionPolicy>("KEEP");
  const [onNoShow, setOnNoShow] = useState<DepositRetentionPolicy>("KEEP");
  const [onInstituteCancel, setOnInstituteCancel] =
    useState<DepositRetentionPolicy>("REFUND");
  const [noShowWarnAt, setNoShowWarnAt] = useState("1");
  const [noShowRequireDepositAt, setNoShowRequireDepositAt] = useState("2");
  const [noShowStrictAt, setNoShowStrictAt] = useState("3");

  const load = useCallback(async () => {
    try {
      const s = await getBookingPolicy();
      setDepositsEnabled(s.depositsEnabled);
      setDefaultMode(s.defaultMode);
      setDefaultFixedAmount(
        s.defaultFixedAmount != null ? String(s.defaultFixedAmount) : "",
      );
      setDefaultPercent(s.defaultPercent != null ? String(s.defaultPercent) : "");
      setConfirmDeadlineHours(String(s.confirmDeadlineHours));
      setLateCancelHours(String(s.lateCancelHours));
      setOnCustomerLateCancel(s.onCustomerLateCancel);
      setOnNoShow(s.onNoShow);
      setOnInstituteCancel(s.onInstituteCancel);
      setNoShowWarnAt(String(s.noShowWarnAt));
      setNoShowRequireDepositAt(String(s.noShowRequireDepositAt));
      setNoShowStrictAt(String(s.noShowStrictAt));
    } catch {
      toast("Impossible de charger la politique de réservation.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  async function handleSave() {
    if (!canEdit) return;
    setSubmitting(true);
    const result = await updateBookingPolicyApi({
      depositsEnabled,
      defaultMode,
      defaultFixedAmount: defaultFixedAmount ? Number(defaultFixedAmount) : null,
      defaultPercent: defaultPercent ? Number(defaultPercent) : null,
      confirmDeadlineHours: Number(confirmDeadlineHours) || 24,
      lateCancelHours: Number(lateCancelHours) || 24,
      onCustomerLateCancel,
      onNoShow,
      onInstituteCancel,
      noShowWarnAt: Number(noShowWarnAt) || 1,
      noShowRequireDepositAt: Number(noShowRequireDepositAt) || 2,
      noShowStrictAt: Number(noShowStrictAt) || 3,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Politique de réservation enregistrée.", "success");
  }

  if (loading) return <p className="text-sm text-ink/50">Chargement…</p>;

  return (
    <div className="space-y-6">
      <BookingQrPanel />

      <section className="space-y-3">
        <p className="font-medium">Acomptes (hors ligne)</p>
        <p className="text-xs text-ink/50">
          Aucun paiement en ligne. L&apos;institut enregistre un paiement DEPOSIT pour
          confirmer le RDV.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={depositsEnabled}
            onChange={(e) => setDepositsEnabled(e.target.checked)}
            disabled={!canEdit}
            className="size-4 rounded border-line"
          />
          Activer les acomptes
        </label>

        <label className="block space-y-1.5 text-sm">
          <span>Acompte par défaut (si le service n&apos;en a pas)</span>
          <select
            className="w-full rounded-lg border border-line px-3 py-2"
            value={defaultMode}
            disabled={!canEdit}
            onChange={(e) => setDefaultMode(e.target.value as DepositDefaultMode)}
          >
            <option value="NONE">Aucun</option>
            <option value="FIXED">Montant fixe (MAD)</option>
            <option value="PERCENT">Pourcentage du prix</option>
          </select>
        </label>

        {defaultMode === "FIXED" ? (
          <label className="block space-y-1.5 text-sm">
            <span>Montant fixe</span>
            <Input
              type="number"
              min={0}
              value={defaultFixedAmount}
              onChange={(e) => setDefaultFixedAmount(e.target.value)}
              disabled={!canEdit}
            />
          </label>
        ) : null}
        {defaultMode === "PERCENT" ? (
          <label className="block space-y-1.5 text-sm">
            <span>Pourcentage</span>
            <Input
              type="number"
              min={0}
              max={100}
              value={defaultPercent}
              onChange={(e) => setDefaultPercent(e.target.value)}
              disabled={!canEdit}
            />
          </label>
        ) : null}

        <label className="block space-y-1.5 text-sm">
          <span>Délai pour confirmer le paiement (heures)</span>
          <Input
            type="number"
            min={1}
            value={confirmDeadlineHours}
            onChange={(e) => setConfirmDeadlineHours(e.target.value)}
            disabled={!canEdit}
          />
        </label>

        <label className="block space-y-1.5 text-sm">
          <span>Annulation tardive (heures avant le RDV)</span>
          <Input
            type="number"
            min={0}
            value={lateCancelHours}
            onChange={(e) => setLateCancelHours(e.target.value)}
            disabled={!canEdit}
          />
        </label>

        <p className="pt-2 font-medium">Politique d&apos;annulation / no-show</p>
        <label className="block space-y-1.5 text-sm">
          <span>Cliente — annulation tardive</span>
          <select
            className="w-full rounded-lg border border-line px-3 py-2"
            value={onCustomerLateCancel}
            disabled={!canEdit}
            onChange={(e) =>
              setOnCustomerLateCancel(e.target.value as DepositRetentionPolicy)
            }
          >
            <option value="KEEP">Conserver l&apos;acompte</option>
            <option value="REFUND">Rembourser l&apos;acompte</option>
          </select>
        </label>
        <label className="block space-y-1.5 text-sm">
          <span>No-show</span>
          <select
            className="w-full rounded-lg border border-line px-3 py-2"
            value={onNoShow}
            disabled={!canEdit}
            onChange={(e) => setOnNoShow(e.target.value as DepositRetentionPolicy)}
          >
            <option value="KEEP">Conserver l&apos;acompte</option>
            <option value="REFUND">Rembourser l&apos;acompte</option>
          </select>
        </label>
        <label className="block space-y-1.5 text-sm">
          <span>Institut annule</span>
          <select
            className="w-full rounded-lg border border-line px-3 py-2"
            value={onInstituteCancel}
            disabled={!canEdit}
            onChange={(e) =>
              setOnInstituteCancel(e.target.value as DepositRetentionPolicy)
            }
          >
            <option value="KEEP">Conserver l&apos;acompte</option>
            <option value="REFUND">Rembourser l&apos;acompte</option>
          </select>
        </label>
      </section>

      <section className="space-y-3 border-t border-line pt-4">
        <p className="font-medium">Anti no-show</p>
        <label className="block space-y-1.5 text-sm">
          <span>Avertissement dès (nb no-shows)</span>
          <Input
            type="number"
            min={1}
            value={noShowWarnAt}
            onChange={(e) => setNoShowWarnAt(e.target.value)}
            disabled={!canEdit}
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span>Acompte obligatoire dès</span>
          <Input
            type="number"
            min={1}
            value={noShowRequireDepositAt}
            onChange={(e) => setNoShowRequireDepositAt(e.target.value)}
            disabled={!canEdit}
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span>Confirmation bloquée sans acompte dès</span>
          <Input
            type="number"
            min={1}
            value={noShowStrictAt}
            onChange={(e) => setNoShowStrictAt(e.target.value)}
            disabled={!canEdit}
          />
        </label>
      </section>

      {canEdit ? (
        <Button disabled={submitting} onClick={handleSave}>
          Enregistrer
        </Button>
      ) : (
        <p className="text-xs text-ink/45">Lecture seule pour votre rôle.</p>
      )}
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
        ) : tab === "Réservation" ? (
          <BookingPolicySettingsForm />
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
