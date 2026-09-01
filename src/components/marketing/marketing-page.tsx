"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { AppPageHeader, Kpi } from "@/components/app/AppUi";
import { useCurrentUser } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { canPrepareCampaigns, canWriteCampaigns } from "@/lib/rbac";
import {
  CAMPAIGN_CHANNEL_LABEL,
  CAMPAIGN_STATUS_LABEL,
  createCampaign,
  DEFAULT_CAMPAIGN_MESSAGE,
  formatMad,
  listCampaigns,
  previewCampaignAudience,
  prepareCampaign,
} from "@/modules/marketing/service";
import { listPromotions } from "@/modules/promo/service";
import { listServices } from "@/modules/services/service";
import type { CampaignChannel, CampaignListItem, CampaignPreviewResult } from "@/types/campaign";

export function MarketingPageView() {
  const { toast } = useToast();
  const router = useRouter();
  const user = useCurrentUser();
  const canWrite = canWriteCampaigns(user.role);
  const canPrepare = canPrepareCampaigns(user.role);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CampaignListItem[]>([]);
  const [kpis, setKpis] = useState<Awaited<ReturnType<typeof listCampaigns>>["kpis"] | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [channel, setChannel] = useState<CampaignChannel>("WHATSAPP");
  const [message, setMessage] = useState(DEFAULT_CAMPAIGN_MESSAGE);
  const [minDays, setMinDays] = useState("60");
  const [serviceId, setServiceId] = useState("");
  const [promotionId, setPromotionId] = useState("");
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [promotions, setPromotions] = useState<{ id: string; name: string }[]>([]);
  const [preview, setPreview] = useState<CampaignPreviewResult | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await listCampaigns();
      setItems(res.items);
      setKpis(res.kpis);
    } catch {
      toast("Impossible de charger le marketing.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      refresh(),
      listServices({ limit: 100 }).then((s) => setServices(s.data.map((x) => ({ id: x.id, name: x.name })))),
      listPromotions().then((p) =>
        setPromotions(p.data.map((x) => ({ id: x.id, name: x.name + (x.code ? ` (${x.code})` : "") }))),
      ),
    ]).finally(() => setLoading(false));
  }, [refresh]);

  function resetForm() {
    setStep(1);
    setName("");
    setChannel("WHATSAPP");
    setMessage(DEFAULT_CAMPAIGN_MESSAGE);
    setMinDays("60");
    setServiceId("");
    setPromotionId("");
    setPreview(null);
  }

  async function handlePreview() {
    setSubmitting(true);
    try {
      const result = await previewCampaignAudience({
        channel,
        messageTemplate: message,
        promotionId: promotionId || null,
        segmentFilters: {
          minDaysSinceLastVisit: Number(minDays) || 60,
          serviceIds: serviceId ? [serviceId] : undefined,
          marketingWhatsapp: channel === "WHATSAPP",
          marketingEmail: channel === "EMAIL",
          noUpcomingAppointment: true,
          excludeRecentMarketing: true,
        },
      });
      setPreview(result);
      setStep(2);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur preview", "error");
    }
    setSubmitting(false);
  }

  async function handleCreate() {
    setSubmitting(true);
    const result = await createCampaign({
      name,
      channel,
      messageTemplate: message,
      promotionId: promotionId || undefined,
      segmentFilters: {
        minDaysSinceLastVisit: Number(minDays) || 60,
        serviceIds: serviceId ? [serviceId] : undefined,
        marketingWhatsapp: channel === "WHATSAPP",
        marketingEmail: channel === "EMAIL",
        noUpcomingAppointment: true,
        excludeRecentMarketing: true,
      },
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setOpen(false);
    resetForm();
    toast("Campagne créée.", "success");
    refresh();
    router.push(`/marketing/${result.campaign.id}`);
  }

  async function handleQuickPrepare(c: CampaignListItem) {
    if (!canPrepare) return;
    setSubmitting(true);
    const result = await prepareCampaign(c.id);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast(`${result.result.prepared} messages préparés — voir WhatsApp.`, "success");
    refresh();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title="Marketing"
        description="Campagnes → destinataires → WhatsAppTask → envoi manuel wa.me"
        action={canWrite ? <Button onClick={() => { resetForm(); setOpen(true); }}>+ Campagne</Button> : null}
      />

      {kpis ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Kpi label="Campagnes actives" value={String(kpis.activeCampaigns)} />
          <Kpi label="Clientes ciblées" value={String(kpis.targetedCustomers)} />
          <Kpi label="Messages à envoyer" value={String(kpis.pendingMessages)} />
          <Kpi label="Messages envoyés" value={String(kpis.sentMessages)} hint="Marqués manuellement" />
          <Kpi
            label="CA associé"
            value={formatMad(kpis.attributedRevenue)}
            hint="Factures promo liées — relation connue uniquement"
          />
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-ink/50">Chargement…</p>
      ) : items.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-ink/50">
          Aucune campagne — créez votre première campagne ciblée.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((c) => (
            <li key={c.id} className="surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/marketing/${c.id}`} className="text-lg font-medium hover:text-primary">
                    {c.name}
                  </Link>
                  <p className="mt-1 text-xs text-ink/50">
                    {CAMPAIGN_CHANNEL_LABEL[c.channel]} · {CAMPAIGN_STATUS_LABEL[c.status]}
                    {c.promotionName ? ` · ${c.promotionName}` : ""}
                  </p>
                </div>
                <div className="text-right text-sm tabular-nums text-ink/60">
                  <p>{c.audienceCount} clientes</p>
                  <p className="text-xs">
                    {c.pendingCount} à envoyer · {c.sentCount} envoyés
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/marketing/${c.id}`} className="btn-ghost">
                  Détail
                </Link>
                {canPrepare && c.status === "DRAFT" ? (
                  <Button size="sm" disabled={submitting} onClick={() => handleQuickPrepare(c)}>
                    Préparer l&apos;audience
                  </Button>
                ) : null}
                {c.pendingCount > 0 ? (
                  <Link href="/whatsapp/" className="btn-primary">
                    Ouvrir WhatsApp ({c.pendingCount})
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={step === 1 ? "Nouvelle campagne" : "Prévisualisation audience"}
      >
        {step === 1 ? (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs text-ink/50">Nom</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Promo rentrée 2026" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-ink/50">Canal</span>
              <Select value={channel} onChange={(e) => setChannel(e.target.value as CampaignChannel)}>
                <option value="WHATSAPP">WhatsApp (manuel)</option>
                <option value="EMAIL">E-mail (V1 — liste seulement)</option>
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-ink/50">Service (optionnel)</span>
              <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                <option value="">Tous services</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-ink/50">Dernière visite &gt; (jours)</span>
              <Input value={minDays} onChange={(e) => setMinDays(e.target.value)} type="number" min={1} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-ink/50">Promotion liée</span>
              <Select value={promotionId} onChange={(e) => setPromotionId(e.target.value)}>
                <option value="">Aucune</option>
                {promotions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-ink/50">Message</span>
              <textarea
                className="input min-h-[160px] w-full font-mono text-sm"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>
            <Button disabled={submitting || !name.trim()} onClick={handlePreview}>
              Prévisualiser l&apos;audience
            </Button>
          </div>
        ) : preview ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-primary-light/40 p-4">
              <p className="text-2xl font-semibold tabular-nums">{preview.eligibleCount} clientes</p>
              <p className="text-sm text-ink/60">
                {preview.excludedCount} exclue(s) (opt-in, spam, RDV futur…)
              </p>
              <ul className="mt-2 space-y-1 text-xs text-ink/55">
                {preview.checks.map((c) => (
                  <li key={c}>✓ {c}</li>
                ))}
              </ul>
            </div>
            {preview.sampleMessage ? (
              <div>
                <p className="mb-2 text-xs text-ink/50">
                  Exemple {preview.sampleCustomer ? `— ${preview.sampleCustomer.name}` : ""}
                </p>
                <pre className="whitespace-pre-wrap rounded-xl bg-ink/[0.03] p-3 text-sm">{preview.sampleMessage}</pre>
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(1)}>Retour</Button>
              <Button disabled={submitting || preview.eligibleCount === 0} onClick={handleCreate}>
                Créer la campagne
              </Button>
            </div>
          </div>
        ) : null}
      </Drawer>
    </motion.div>
  );
}
