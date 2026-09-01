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
  createGiftCard,
  formatMad,
  GIFT_CARD_STATUS_LABEL,
  listGiftCards,
} from "@/modules/promo/service";
import { listCustomers } from "@/modules/customers/service";
import type { GiftCardKpis, GiftCardListItem } from "@/types/promo";

export function GiftCardsPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWritePromotions(user.role);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<GiftCardListItem[]>([]);
  const [kpis, setKpis] = useState<GiftCardKpis | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState("500");
  const [buyerId, setBuyerId] = useState("");
  const [beneficiaryId, setBeneficiaryId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await listGiftCards();
      setRows(res.data);
      setKpis(res.kpis);
    } catch {
      toast("Impossible de charger les cartes cadeaux.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (!canWrite) return;
    listCustomers({ limit: 100 })
      .then((r) =>
        setCustomers(
          r.data.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` })),
        ),
      )
      .catch(() => undefined);
  }, [canWrite]);

  async function handleCreate() {
    setSubmitting(true);
    const result = await createGiftCard({
      amount: Number(amount),
      buyerCustomerId: buyerId || undefined,
      beneficiaryCustomerId: beneficiaryId || undefined,
      expiresAt: expiresAt || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setCreatedCode(result.card.code);
    toast("Carte cadeau créée.", "success");
    refresh();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title="Cartes cadeaux"
        description="Ledger ISSUED / REDEEMED — solde jamais modifié directement."
        action={
          canWrite ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setCreatedCode(null);
                setOpen(true);
              }}
            >
              + Créer
            </button>
          ) : undefined
        }
      />

      {kpis ? (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Cartes vendues" value={String(kpis.soldCount)} />
          <Kpi label="Valeur vendue" value={formatMad(kpis.soldValue)} />
          <Kpi label="Valeur utilisée" value={formatMad(kpis.redeemedValue)} />
          <Kpi label="Solde restant" value={formatMad(kpis.remainingBalance)} />
        </div>
      ) : null}

      {loading ? (
        <div className="surface p-8 text-center text-sm text-ink/50">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-ink/50">Aucune carte cadeau.</div>
      ) : (
        <ResponsiveTable
          headers={["Code", "Valeur", "Solde", "Bénéficiaire", "Statut"]}
          minWidthClass="min-w-[640px]"
          cards={rows.map((c) => (
            <div key={c.id} className="surface mb-2 p-3 text-center text-sm">
              <p className="font-mono text-primary">{c.code}</p>
              <p className="mt-1 font-semibold">{formatMad(c.balance)}</p>
              <p className="text-xs text-ink/45">{GIFT_CARD_STATUS_LABEL[c.status]}</p>
            </div>
          ))}
        >
          {rows.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3 font-mono text-sm text-primary">{c.code}</td>
              <td className="px-4 py-3 font-mono text-sm">{formatMad(c.initialValue)}</td>
              <td className="px-4 py-3 font-mono text-sm">{formatMad(c.balance)}</td>
              <td className="px-4 py-3 text-sm">{c.beneficiaryName ?? "—"}</td>
              <td className="px-4 py-3 text-sm">{GIFT_CARD_STATUS_LABEL[c.status]}</td>
            </tr>
          ))}
        </ResponsiveTable>
      )}

      <Drawer open={open} onClose={() => setOpen(false)} title="Carte cadeau">
        {createdCode ? (
          <div className="space-y-4 text-center text-sm">
            <p className="text-ink/60">Code généré</p>
            <p className="font-mono text-lg text-primary">{createdCode}</p>
            <p className="font-semibold">{formatMad(Number(amount))}</p>
            <Button type="button" variant="primary" className="w-full" onClick={() => setOpen(false)}>
              Fermer
            </Button>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <label className="block">
              <span className="mb-1.5 block font-medium">Montant (MAD)</span>
              <Input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-medium">Acheteur</span>
              <Select value={buyerId} onChange={(e) => setBuyerId(e.target.value)}>
                <option value="">—</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1.5 block font-medium">Bénéficiaire</span>
              <Select
                value={beneficiaryId}
                onChange={(e) => setBeneficiaryId(e.target.value)}
              >
                <option value="">—</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1.5 block font-medium">Expiration</span>
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </label>
            <Button
              type="button"
              variant="primary"
              className="w-full"
              disabled={submitting || !amount}
              onClick={handleCreate}
            >
              Créer
            </Button>
          </div>
        )}
      </Drawer>
    </motion.div>
  );
}
