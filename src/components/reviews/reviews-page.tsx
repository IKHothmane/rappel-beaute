"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { AppPageHeader, Kpi, Tabs } from "@/components/app/AppUi";
import { useCurrentUser } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import { canSendReviews } from "@/lib/rbac";
import { markWhatsAppSent } from "@/modules/whatsapp/service";
import {
  formatAverageScore,
  formatCompletedWhen,
  formatHoursSince,
  formatSatisfiedPercent,
  getReviewsDashboard,
  recordReviewSatisfaction,
  REVIEW_SATISFACTION_EMOJI,
  REVIEW_SATISFACTION_LABEL,
  skipReviewRequest,
} from "@/modules/reviews/service";
import type {
  ReviewAlertItem,
  ReviewKpis,
  ReviewRequestItem,
  ReviewRequestStatus,
  ReviewSatisfaction,
  ReviewSettings,
} from "@/types/review";

const FILTER_TABS = ["À envoyer", "Envoyées", "Enregistrées", "Ignorées"] as const;

const TAB_TO_STATUS: Record<string, ReviewRequestStatus | "ALL"> = {
  "À envoyer": "PENDING",
  Envoyées: "SENT",
  Enregistrées: "RECORDED",
  Ignorées: "SKIPPED",
};

const SATISFACTIONS: ReviewSatisfaction[] = ["VERY_SATISFIED", "SATISFIED", "DISSATISFIED"];

export function ReviewsPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canSend = canSendReviews(user.role);

  const [tab, setTab] = useState<string>("À envoyer");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReviewRequestItem[]>([]);
  const [kpis, setKpis] = useState<ReviewKpis | null>(null);
  const [settings, setSettings] = useState<ReviewSettings | null>(null);
  const [alerts, setAlerts] = useState<ReviewAlertItem[]>([]);
  const [preview, setPreview] = useState<ReviewRequestItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeAlert, setActiveAlert] = useState<ReviewAlertItem | null>(null);

  const refresh = useCallback(async () => {
    try {
      const status = TAB_TO_STATUS[tab] ?? "PENDING";
      const res = await getReviewsDashboard({ status });
      setItems(res.items);
      setKpis(res.kpis);
      setSettings(res.settings);
      setAlerts(res.alerts);
    } catch {
      toast("Impossible de charger les avis.", "error");
    }
  }, [tab, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function handleMarkSent(item: ReviewRequestItem) {
    if (!canSend || !item.whatsappTaskId) return;
    setSubmitting(true);
    const result = await markWhatsAppSent(item.whatsappTaskId);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Demande marquée comme envoyée.", "success");
    setPreview(null);
    refresh();
  }

  async function handleSkip(reviewId: string) {
    if (!canSend) return;
    setSubmitting(true);
    const result = await skipReviewRequest(reviewId);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Demande ignorée.", "success");
    setPreview(null);
    refresh();
  }

  async function handleSatisfaction(reviewId: string, satisfaction: ReviewSatisfaction) {
    if (!canSend) return;
    setSubmitting(true);
    const result = await recordReviewSatisfaction(reviewId, satisfaction);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Satisfaction enregistrée.", "success");
    if (result.alert) {
      setActiveAlert(result.alert);
    }
    refresh();
  }

  const settingsWarning =
    settings && (!settings.enabled || !settings.googleReviewUrl)
      ? settings.enabled
        ? "Configurez le lien Google Review dans Paramètres → Communication."
        : "Les demandes d'avis sont désactivées dans les paramètres."
      : null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title="Avis clients"
        description="Demandes après rendez-vous terminé — envoi WhatsApp manuel assisté."
        action={
          <Link href="/settings/" className="btn-ghost">
            Paramètres
          </Link>
        }
      />

      {kpis ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Kpi label="Demandes à envoyer" value={String(kpis.pendingToSend)} />
          <Kpi label="Envoyées ce mois" value={String(kpis.sentThisMonth)} />
          <Kpi label="Avis enregistrés" value={String(kpis.recordedCount)} />
          <Kpi
            label="Note moyenne"
            value={formatAverageScore(kpis.averageScore)}
            hint="Satisfaction interne (saisie manuelle)"
          />
          <Kpi
            label="Clientes satisfaites"
            value={formatSatisfiedPercent(kpis.satisfiedPercent)}
            hint="Très satisfaites + satisfaites"
          />
        </div>
      ) : null}

      {settingsWarning ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {settingsWarning}
        </div>
      ) : null}

      {alerts.length > 0 ? (
        <div className="mb-4 space-y-2">
          {alerts.map((a) => (
            <div
              key={a.reviewRequestId}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm"
            >
              <p className="font-medium text-red-800">🚨 Alerte — cliente insatisfaite</p>
              <p className="mt-1 text-red-700">
                {a.customerName} · {a.serviceName} · {REVIEW_SATISFACTION_LABEL[a.satisfaction]}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link href={`/customers/${a.customerId}/`} className="btn-ghost text-xs">
                  Voir cliente
                </Link>
                <Link href="/whatsapp/" className="btn-ghost text-xs">
                  Contacter
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <Tabs tabs={[...FILTER_TABS]} value={tab} onChange={setTab} />

      {loading ? (
        <p className="text-sm text-ink/50">Chargement…</p>
      ) : items.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-ink/50">
          {tab === "À envoyer"
            ? "Aucune demande à envoyer pour le moment."
            : `Aucune demande dans « ${tab} ».`}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-medium">{item.customerName}</p>
                  <p className="mt-1 text-sm text-ink/60">{item.serviceName}</p>
                </div>
                {item.satisfaction ? (
                  <span className="rounded-full bg-ink/[0.04] px-2 py-1 text-sm">
                    {REVIEW_SATISFACTION_EMOJI[item.satisfaction]}{" "}
                    {REVIEW_SATISFACTION_LABEL[item.satisfaction]}
                  </span>
                ) : null}
              </div>

              <div className="mt-3 grid gap-1 text-sm text-ink/60 sm:grid-cols-2">
                <p>
                  Terminé : <strong>{formatCompletedWhen(item.completedAt)}</strong>
                </p>
                <p>
                  Délai : <strong>{formatHoursSince(item.hoursSinceCompleted)}</strong>
                </p>
                {item.sentAt ? (
                  <p>
                    Envoyé : <strong>{formatCompletedWhen(item.sentAt)}</strong>
                  </p>
                ) : null}
              </div>

              {!item.googleReviewUrl && tab === "À envoyer" ? (
                <p className="mt-2 text-xs text-amber-700">
                  Lien Google Review non configuré — le message sera incomplet.
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/customers/${item.customerId}/`} className="btn-ghost">
                  Voir cliente
                </Link>

                {canSend && item.status === "PENDING" ? (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => setPreview(item)}>
                      Prévisualiser
                    </Button>
                    <a
                      href={item.waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary"
                    >
                      Ouvrir WhatsApp
                    </a>
                    <Button
                      size="sm"
                      disabled={submitting || !item.whatsappTaskId}
                      onClick={() => handleMarkSent(item)}
                    >
                      Marquer envoyé
                    </Button>
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={submitting}
                      onClick={() => handleSkip(item.id)}
                    >
                      Ignorer
                    </button>
                  </>
                ) : null}

                {canSend && item.status === "SENT" && !item.satisfaction ? (
                  <div className="flex w-full flex-wrap items-center gap-2 border-t border-line pt-3">
                    <span className="text-xs text-ink/50">Satisfaction cliente :</span>
                    {SATISFACTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-primary hover:bg-primary/5"
                        disabled={submitting}
                        onClick={() => handleSatisfaction(item.id, s)}
                        title={REVIEW_SATISFACTION_LABEL[s]}
                      >
                        {REVIEW_SATISFACTION_EMOJI[s]}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Drawer open={!!preview} onClose={() => setPreview(null)} title="Demande d'avis">
        {preview ? (
          <div className="space-y-4">
            <p className="text-sm text-ink/60">
              {preview.customerName} · {preview.serviceName}
            </p>
            <pre className="whitespace-pre-wrap rounded-xl bg-ink/[0.03] p-4 text-sm leading-relaxed">
              {preview.messageSnapshot}
            </pre>
            {preview.googleReviewUrl ? (
              <p className="text-xs text-ink/50">
                Lien Google :{" "}
                <a
                  href={preview.googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  {preview.googleReviewUrl}
                </a>
              </p>
            ) : (
              <p className="text-xs text-amber-700">
                Aucun lien Google configuré — ajoutez-le dans Paramètres → Communication.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <a
                href={preview.waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Ouvrir WhatsApp
              </a>
              {canSend ? (
                <>
                  <Button
                    disabled={submitting || !preview.whatsappTaskId}
                    onClick={() => handleMarkSent(preview)}
                  >
                    Marquer envoyé
                  </Button>
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={submitting}
                    onClick={() => handleSkip(preview.id)}
                  >
                    Ignorer
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </Drawer>

      <Drawer
        open={!!activeAlert}
        onClose={() => setActiveAlert(null)}
        title="Alerte — cliente insatisfaite"
      >
        {activeAlert ? (
          <div className="space-y-4">
            <p className="text-sm">
              <strong>{activeAlert.customerName}</strong>
              <br />
              Service : {activeAlert.serviceName}
              <br />
              Satisfaction : {REVIEW_SATISFACTION_LABEL[activeAlert.satisfaction]}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/customers/${activeAlert.customerId}/`} className="btn-primary">
                Voir cliente
              </Link>
              <Link href="/whatsapp/" className="btn-ghost">
                Contacter
              </Link>
            </div>
          </div>
        ) : null}
      </Drawer>
    </motion.div>
  );
}
