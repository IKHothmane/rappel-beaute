"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { AppPageHeader, Kpi } from "@/components/app/AppUi";
import { ResponsiveTable } from "@/components/app/ResponsiveTable";
import { useCurrentUser } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { canWritePromotions } from "@/lib/rbac";
import {
  createPromotion,
  formatMad,
  listPromotions,
  PROMOTION_STATUS_LABEL,
  PROMOTION_TYPE_LABEL,
  setPromotionStatus,
} from "@/modules/promo/service";
import type { PromotionKpis, PromotionListItem, PromotionType } from "@/types/promo";
import { PROMOTION_TYPES } from "@/types/promo";

export function PromotionsPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWritePromotions(user.role);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PromotionListItem[]>([]);
  const [kpis, setKpis] = useState<PromotionKpis | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<PromotionType>("PERCENTAGE");
  const [value, setValue] = useState("20");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxUses, setMaxUses] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await listPromotions();
      setRows(res.data);
      setKpis(res.kpis);
    } catch {
      toast("Impossible de charger les promotions.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function handleCreate() {
    setSubmitting(true);
    const result = await createPromotion({
      name,
      code: code || undefined,
      type,
      value: Number(value) || undefined,
      startsAt: startsAt || undefined,
      endsAt: endsAt || undefined,
      minAmount: minAmount ? Number(minAmount) : undefined,
      maxUses: maxUses ? Number(maxUses) : undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setOpen(false);
    toast("Promotion créée.", "success");
    refresh();
  }

  function formatValidity(p: PromotionListItem) {
    if (p.timeStart && p.timeEnd) return `${p.timeStart}–${p.timeEnd}`;
    if (p.startsAt || p.endsAt) {
      const a = p.startsAt ? new Date(p.startsAt).toLocaleDateString("fr-FR") : "…";
      const b = p.endsAt ? new Date(p.endsAt).toLocaleDateString("fr-FR") : "…";
      return `${a} → ${b}`;
    }
    return "—";
  }

  function formatValue(p: PromotionListItem) {
    if (p.type === "PERCENTAGE") return `${p.value ?? 0} %`;
    if (p.value != null) return formatMad(p.value);
    return "—";
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title="Promotions"
        description="Remises recalculées côté serveur — snapshots facture."
        action={
          canWrite ? (
            <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
              + Promotion
            </button>
          ) : undefined
        }
      />

      {kpis ? (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Promotions actives" value={String(kpis.activeCount)} />
          <Kpi label="Utilisées ce mois" value={String(kpis.usedThisMonth)} />
          <Kpi label="Remises accordées" value={formatMad(kpis.discountTotalMonth)} />
          <Kpi label="CA généré" value={formatMad(kpis.estimatedRevenueMonth)} />
        </div>
      ) : null}

      {loading ? (
        <div className="surface p-8 text-center text-sm text-ink/50">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-ink/50">Aucune promotion.</div>
      ) : (
        <ResponsiveTable
          headers={["Nom", "Type", "Remise", "Validité", "Statut"]}
          minWidthClass="min-w-[720px]"
          cards={rows.map((p) => (
            <div key={p.id} className="surface mb-2 p-3 text-sm">
              <p className="font-medium">{p.name}</p>
              <p className="text-ink/55">
                {PROMOTION_TYPE_LABEL[p.type]} · {formatValue(p)}
              </p>
              <p className="text-xs">{PROMOTION_STATUS_LABEL[p.status]}</p>
            </div>
          ))}
        >
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-[#FBF4F6]/50">
              <td className="px-4 py-3 text-sm">
                {p.name}
                {p.code ? (
                  <span className="ml-2 font-mono text-xs text-ink/40">{p.code}</span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-sm">{PROMOTION_TYPE_LABEL[p.type]}</td>
              <td className="px-4 py-3 font-mono text-sm">{formatValue(p)}</td>
              <td className="px-4 py-3 text-sm whitespace-nowrap">{formatValidity(p)}</td>
              <td className="px-4 py-3 text-sm">
                {PROMOTION_STATUS_LABEL[p.status]}
                {canWrite && p.status === "ACTIVE" ? (
                  <button
                    type="button"
                    className="ml-2 text-xs text-ink/45"
                    onClick={async () => {
                      const r = await setPromotionStatus(p.id, "INACTIVE");
                      if (!r.ok) toast(r.error, "error");
                      else refresh();
                    }}
                  >
                    Désactiver
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      )}

      <Drawer open={open} onClose={() => setOpen(false)} title="Nouvelle promotion">
        <div className="space-y-3 text-sm">
          <Input placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            placeholder="Code (ex. RENTREE20)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as PromotionType)}
          >
            {PROMOTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {PROMOTION_TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
          <Input
            type="number"
            placeholder="Valeur (% ou MAD)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          <Input
            type="number"
            placeholder="Montant minimum MAD"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Max utilisations"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
          />
          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={submitting || !name}
            onClick={handleCreate}
          >
            Créer
          </Button>
        </div>
      </Drawer>
    </motion.div>
  );
}
