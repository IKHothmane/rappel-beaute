"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { AppPageHeader, Kpi, Tabs } from "@/components/app/AppUi";
import { useCurrentUser } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  canSendReactivation,
  canWriteReactivationSettings,
} from "@/lib/rbac";
import {
  formatLastVisit,
  formatMad,
  getReactivationDashboard,
  prepareReactivationWhatsApp,
  REACTIVATION_BUCKET_LABEL,
  snoozeReactivationCustomer,
  updateReactivationSettings,
} from "@/modules/reactivation/service";
import type {
  ReactivationBucket,
  ReactivationCustomerItem,
  ReactivationKpis,
  ReactivationSettings,
} from "@/types/reactivation";

const FILTER_TABS = [
  "Toutes",
  "30 jours",
  "45 jours",
  "60 jours",
  "90 jours",
  "À risque",
] as const;

const TAB_TO_BUCKET: Record<string, ReactivationBucket | null> = {
  Toutes: null,
  "30 jours": "DAYS_30",
  "45 jours": "DAYS_45",
  "60 jours": "DAYS_60",
  "90 jours": "DAYS_90",
  "À risque": "AT_RISK",
};

function bucketBadgeClass(bucket: ReactivationBucket): string {
  if (bucket === "DAYS_30") return "text-amber-600";
  if (bucket === "DAYS_45") return "text-orange-600";
  if (bucket === "DAYS_60") return "text-red-500";
  if (bucket === "DAYS_90" || bucket === "AT_RISK") return "text-red-700";
  return "text-ink/50";
}

export function ReactivationPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canSend = canSendReactivation(user.role);
  const canConfigure = canWriteReactivationSettings(user.role);

  const [tab, setTab] = useState<string>("Toutes");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReactivationCustomerItem[]>([]);
  const [kpis, setKpis] = useState<ReactivationKpis | null>(null);
  const [settings, setSettings] = useState<ReactivationSettings | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preview, setPreview] = useState<{ message: string; waLink: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [minDays, setMinDays] = useState("30");
  const [autoSync, setAutoSync] = useState(true);
  const [promo45, setPromo45] = useState("RETOUR10");
  const [discount45, setDiscount45] = useState("-10%");

  const refresh = useCallback(async () => {
    try {
      const bucket = TAB_TO_BUCKET[tab] ?? null;
      const res = await getReactivationDashboard({ bucket, relanceOnly: true });
      setItems(res.data);
      setKpis(res.kpis);
      setSettings(res.settings);
      setMinDays(String(res.settings.minimumDaysBetweenMarketingMessages));
      setAutoSync(res.settings.autoCreateWhatsAppTasks);
      setPromo45(res.settings.promoCode45 ?? "");
      setDiscount45(res.settings.promoDiscount45 ?? "-10%");
    } catch {
      toast("Impossible de charger la réactivation.", "error");
    }
  }, [tab, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function handlePrepareWhatsApp(customer: ReactivationCustomerItem) {
    if (!canSend) return;
    setSubmitting(true);
    const result = await prepareReactivationWhatsApp(customer.id);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Message préparé — visible dans WhatsApp.", "success");
    setPreview({ message: result.message, waLink: result.waLink });
    refresh();
  }

  async function handleSnooze(customerId: string) {
    if (!canSend) return;
    setSubmitting(true);
    const result = await snoozeReactivationCustomer(customerId, 30);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Cliente ignorée pour 30 jours.", "success");
    refresh();
  }

  async function handleSaveSettings() {
    setSubmitting(true);
    const result = await updateReactivationSettings({
      minimumDaysBetweenMarketingMessages: Number(minDays) || 30,
      autoCreateWhatsAppTasks: autoSync,
      promoCode45: promo45 || null,
      promoDiscount45: discount45 || null,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Paramètres enregistrés.", "success");
    setSettingsOpen(false);
    refresh();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title="Réactivation"
        description="Segments calculés à la volée — relances via WhatsApp manuel assisté."
        action={
          canConfigure ? (
            <Button variant="secondary" onClick={() => setSettingsOpen(true)}>
              Paramètres
            </Button>
          ) : null
        }
      />

      {kpis ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Kpi label="Clientes à relancer" value={String(kpis.toRelance)} />
          <Kpi label="30 jours" value={String(kpis.days30)} />
          <Kpi label="45 jours" value={String(kpis.days45)} />
          <Kpi label="60 jours" value={String(kpis.days60)} />
          <Kpi label="90 jours" value={String(kpis.days90)} />
          <Kpi
            label="CA potentiel estimé"
            value={formatMad(kpis.estimatedRevenue)}
            hint="Panier moyen × clientes à relancer"
          />
        </div>
      ) : null}

      <Tabs tabs={[...FILTER_TABS]} value={tab} onChange={setTab} />

      {loading ? (
        <p className="text-sm text-ink/50">Chargement…</p>
      ) : items.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-ink/50">
          Aucune cliente à relancer pour ce segment.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((c) => (
            <li key={c.id} className="surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-medium">
                    {c.firstName} {c.lastName}
                  </p>
                  <p className={`mt-1 text-xs font-mono uppercase ${bucketBadgeClass(c.bucket)}`}>
                    {REACTIVATION_BUCKET_LABEL[c.bucket]} · {c.daysSinceLastVisit} j sans visite
                  </p>
                </div>
                {!c.marketingWhatsapp ? (
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">
                    Pas d&apos;opt-in WhatsApp
                  </span>
                ) : null}
              </div>

              <div className="mt-3 grid gap-1 text-sm text-ink/60 sm:grid-cols-2">
                <p>
                  Dernière visite : <strong>{formatLastVisit(c.lastVisitAt)}</strong>
                </p>
                <p>
                  Dernier service :{" "}
                  <strong>{c.lastServiceName ?? "—"}</strong>
                  {c.lastServicePrice != null ? ` · ${formatMad(c.lastServicePrice)}` : ""}
                </p>
                <p>
                  Panier moyen : <strong>{formatMad(c.averageTicket)}</strong>
                </p>
                <p>
                  Visites : <strong>{c.visits}</strong> · CA :{" "}
                  <strong>{formatMad(c.totalRevenue)}</strong>
                </p>
              </div>

              {c.blockReason ? (
                <p className="mt-2 text-xs text-ink/45">{c.blockReason}</p>
              ) : null}

              {c.suggestedPromoCode ? (
                <p className="mt-2 text-xs text-primary">
                  Offre suggérée : {c.suggestedPromoDiscount} — code {c.suggestedPromoCode}
                </p>
              ) : null}

              {c.pendingWhatsAppTaskId ? (
                <p className="mt-2 text-xs text-green-700">
                  Tâche WhatsApp en attente — voir file WhatsApp
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/customers/${c.id}`} className="btn-ghost">
                  Voir cliente
                </Link>
                {canSend ? (
                  <>
                    <Button
                      size="sm"
                      disabled={submitting || !c.canPrepareWhatsApp}
                      onClick={() => handlePrepareWhatsApp(c)}
                    >
                      Préparer WhatsApp
                    </Button>
                    <Link
                      href={`/promotions/?suggestCode=${encodeURIComponent(c.suggestedPromoCode ?? "RETOUR10")}&customerId=${c.id}`}
                      className="btn-ghost"
                    >
                      Créer promotion
                    </Link>
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={submitting}
                      onClick={() => handleSnooze(c.id)}
                    >
                      Ignorer
                    </button>
                  </>
                ) : null}
                {c.pendingWhatsAppTaskId ? (
                  <Link href="/whatsapp/" className="btn-primary">
                    Ouvrir WhatsApp
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Drawer open={!!preview} onClose={() => setPreview(null)} title="Message de relance">
        {preview ? (
          <div className="space-y-4">
            <pre className="whitespace-pre-wrap rounded-xl bg-ink/[0.03] p-4 text-sm leading-relaxed">
              {preview.message}
            </pre>
            <a href={preview.waLink} target="_blank" rel="noreferrer" className="btn-primary block text-center">
              Ouvrir WhatsApp
            </a>
          </div>
        ) : null}
      </Drawer>

      <Drawer open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Paramètres réactivation">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs text-ink/50">
              Délai minimum entre messages marketing (jours)
            </span>
            <Input value={minDays} onChange={(e) => setMinDays(e.target.value)} type="number" min={7} max={365} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(e) => setAutoSync(e.target.checked)}
            />
            Créer automatiquement des tâches WhatsApp (sync quotidien)
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-ink/50">Code promo 45 j (exemple)</span>
            <Input value={promo45} onChange={(e) => setPromo45(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-ink/50">Remise affichée 45 j</span>
            <Input value={discount45} onChange={(e) => setDiscount45(e.target.value)} />
          </label>
          {settings ? (
            <p className="text-xs text-ink/40">
              Seuils actifs : 30j={settings.threshold30Enabled ? "oui" : "non"} · 45j=
              {settings.threshold45Enabled ? "oui" : "non"} · 60j=
              {settings.threshold60Enabled ? "oui" : "non"} · 90j=
              {settings.threshold90Enabled ? "oui" : "non"}
            </p>
          ) : null}
          <Button disabled={submitting} onClick={handleSaveSettings}>
            Enregistrer
          </Button>
        </div>
      </Drawer>
    </motion.div>
  );
}
