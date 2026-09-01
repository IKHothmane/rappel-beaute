"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { AppPageHeader, Kpi, Tabs } from "@/components/app/AppUi";
import { useCurrentUser } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { canPrepareCampaigns } from "@/lib/rbac";
import {
  CAMPAIGN_STATUS_LABEL,
  formatMad,
  getCampaign,
  listCampaignRecipients,
  prepareCampaign,
  previewCampaignById,
} from "@/modules/marketing/service";
import type { CampaignDetail, CampaignPreviewResult, CampaignRecipientItem } from "@/types/campaign";

export function MarketingDetailView() {
  const params = useParams();
  const id = String(params.id);
  const { toast } = useToast();
  const user = useCurrentUser();
  const canPrepare = canPrepareCampaigns(user.role);

  const [tab, setTab] = useState("Résumé");
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [recipients, setRecipients] = useState<CampaignRecipientItem[]>([]);
  const [preview, setPreview] = useState<CampaignPreviewResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [c, r] = await Promise.all([getCampaign(id), listCampaignRecipients(id)]);
      setCampaign(c);
      setRecipients(r);
    } catch {
      toast("Campagne introuvable.", "error");
    }
  }, [id, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function handlePrepare() {
    setSubmitting(true);
    const result = await prepareCampaign(id);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast(`${result.result.prepared} destinataires — ${result.result.skipped} exclus.`, "success");
    refresh();
  }

  async function handlePreview() {
    setSubmitting(true);
    try {
      const p = await previewCampaignById(id);
      setPreview(p);
      setTab("Audience");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur", "error");
    }
    setSubmitting(false);
  }

  if (loading || !campaign) {
    return <p className="text-sm text-ink/50">Chargement…</p>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title={campaign.name}
        description={`${CAMPAIGN_STATUS_LABEL[campaign.status]} · ${campaign.audienceCount} clientes ciblées`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/marketing/" className="btn-ghost">← Marketing</Link>
            {canPrepare && campaign.status === "DRAFT" ? (
              <>
                <Button variant="secondary" disabled={submitting} onClick={handlePreview}>
                  Prévisualiser
                </Button>
                <Button disabled={submitting} onClick={handlePrepare}>
                  Préparer l&apos;audience
                </Button>
              </>
            ) : null}
            {campaign.pendingCount > 0 ? (
              <Link href="/whatsapp/" className="btn-primary">
                WhatsApp ({campaign.pendingCount})
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Audience" value={String(campaign.audienceCount)} />
        <Kpi label="À envoyer" value={String(campaign.pendingCount)} />
        <Kpi label="Envoyés" value={String(campaign.sentCount)} hint="Marqués manuellement" />
        <Kpi label="CA associé" value={formatMad(campaign.attributedRevenue)} hint="Relation promo connue" />
      </div>

      <Tabs tabs={["Résumé", "Audience", "Messages", "Résultats"]} value={tab} onChange={setTab} />

      {tab === "Résumé" ? (
        <div className="surface space-y-3 p-5 text-sm">
          <p><strong>Canal :</strong> {campaign.channel}</p>
          <p><strong>Promotion :</strong> {campaign.promotionName ?? "—"}</p>
          <p><strong>Préparée :</strong> {campaign.preparedAt ? new Date(campaign.preparedAt).toLocaleString("fr-FR") : "Non"}</p>
          {campaign.segmentFilters.minDaysSinceLastVisit != null ? (
            <p><strong>Inactivité min. :</strong> {campaign.segmentFilters.minDaysSinceLastVisit} jours</p>
          ) : null}
          {campaign.segmentFilters.serviceIds?.length ? (
            <p><strong>Services :</strong> {campaign.segmentFilters.serviceIds.join(", ")}</p>
          ) : null}
        </div>
      ) : null}

      {tab === "Audience" ? (
        <div className="space-y-3">
          {preview ? (
            <div className="surface p-4 text-sm">
              <p className="font-medium">{preview.eligibleCount} éligibles · {preview.excludedCount} exclues</p>
            </div>
          ) : null}
          {recipients.length === 0 ? (
            <div className="surface p-6 text-sm text-ink/50">
              Audience non préparée — cliquez sur « Préparer l&apos;audience ».
            </div>
          ) : (
            <ul className="space-y-2">
              {recipients.map((r) => (
                <li key={r.id} className="surface flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                  <Link href={`/customers/${r.customerId}`} className="font-medium hover:text-primary">
                    {r.customerName}
                  </Link>
                  <span className="text-xs text-ink/45">{r.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === "Messages" ? (
        <pre className="surface whitespace-pre-wrap p-5 text-sm leading-relaxed">{campaign.messageTemplate}</pre>
      ) : null}

      {tab === "Résultats" ? (
        <div className="surface space-y-2 p-5 text-sm text-ink/70">
          <p>Envoyés : <strong>{campaign.sentCount}</strong> (saisie manuelle via WhatsApp)</p>
          <p>Ignorés / exclus : <strong>{campaign.skippedCount}</strong></p>
          <p>CA associé : <strong>{formatMad(campaign.attributedRevenue)}</strong></p>
          <p className="text-xs text-ink/45">
            Le CA n&apos;est compté que lorsque la cliente de la campagne a une facture avec la promotion liée.
          </p>
        </div>
      ) : null}
    </motion.div>
  );
}
