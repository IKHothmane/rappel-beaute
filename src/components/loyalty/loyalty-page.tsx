"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { AppPageHeader, Kpi, Tabs } from "@/components/app/AppUi";
import { useCurrentUser } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { canWriteLoyalty } from "@/lib/rbac";
import {
  createPackage,
  createReward,
  formatPoints,
  getLoyaltyDashboard,
  listPackages,
  LOYALTY_LEVEL_LABEL,
  updateProgram,
} from "@/modules/loyalty/service";
import { listCustomers } from "@/modules/customers/service";
import { listServices } from "@/modules/services/service";
import type {
  LoyaltyProgramConfig,
  LoyaltyRewardItem,
  PackageListItem,
} from "@/types/loyalty";

export function LoyaltyPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteLoyalty(user.role);
  const [tab, setTab] = useState("Fidélité");
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<{
    membersCount: number;
    pointsDistributed: number;
    pointsRedeemed: number;
    rewardsUsed: number;
  } | null>(null);
  const [ranking, setRanking] = useState<
    {
      customerId: string;
      customerName: string;
      balance: number;
      lifetimePoints: number;
      level: string;
    }[]
  >([]);
  const [rewards, setRewards] = useState<LoyaltyRewardItem[]>([]);
  const [program, setProgram] = useState<LoyaltyProgramConfig | null>(null);
  const [packages, setPackages] = useState<PackageListItem[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [pkgOpen, setPkgOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [madPerPoint, setMadPerPoint] = useState("1");
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);

  const [rewardName, setRewardName] = useState("");
  const [rewardCost, setRewardCost] = useState("500");
  const [rewardType, setRewardType] = useState("DISCOUNT_FIXED");
  const [rewardValue, setRewardValue] = useState("50");

  const [pkgCustomerId, setPkgCustomerId] = useState("");
  const [pkgServiceId, setPkgServiceId] = useState("");
  const [pkgName, setPkgName] = useState("");
  const [pkgSessions, setPkgSessions] = useState("6");
  const [pkgPrice, setPkgPrice] = useState("2400");

  const refresh = useCallback(async () => {
    try {
      const [dash, pkgs] = await Promise.all([
        getLoyaltyDashboard(),
        listPackages(),
      ]);
      setKpis(dash.kpis);
      setRanking(dash.ranking);
      setRewards(dash.rewards);
      setProgram(dash.program);
      setMadPerPoint(String(dash.program.madPerPoint));
      setPackages(pkgs);
    } catch {
      toast("Impossible de charger la fidélité.", "error");
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
          r.data.map((c) => ({
            id: c.id,
            name: `${c.firstName} ${c.lastName}`,
          })),
        ),
      )
      .catch(() => undefined);
    listServices({ limit: 100, active: true })
      .then((r) => setServices(r.data.map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => undefined);
  }, [canWrite]);

  async function saveProgram() {
    setSubmitting(true);
    const result = await updateProgram({ madPerPoint: Number(madPerPoint) });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setProgram(result.program);
    setSettingsOpen(false);
    toast("Règle points enregistrée.", "success");
  }

  async function saveReward() {
    setSubmitting(true);
    const result = await createReward({
      name: rewardName,
      pointsCost: Number(rewardCost),
      type: rewardType as "DISCOUNT_FIXED" | "DISCOUNT_PERCENT" | "FREE_SERVICE",
      value: Number(rewardValue) || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setRewardOpen(false);
    toast("Récompense créée.", "success");
    refresh();
  }

  async function savePackage() {
    setSubmitting(true);
    const result = await createPackage({
      customerId: pkgCustomerId,
      serviceId: pkgServiceId,
      name: pkgName || `Forfait ${services.find((s) => s.id === pkgServiceId)?.name ?? ""}`,
      sessionTotal: Number(pkgSessions),
      pricePaid: Number(pkgPrice),
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setPkgOpen(false);
    toast("Forfait créé.", "success");
    refresh();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title="Fidélité & forfaits"
        description="Ledger points · niveaux · récompenses · forfaits séances."
        action={
          canWrite ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-ghost px-3 py-1.5 text-xs"
                onClick={() => setSettingsOpen(true)}
              >
                Règles
              </button>
              <button
                type="button"
                className="btn-ghost px-3 py-1.5 text-xs"
                onClick={() => setRewardOpen(true)}
              >
                + Récompense
              </button>
              <button type="button" className="btn-primary" onClick={() => setPkgOpen(true)}>
                + Forfait
              </button>
            </div>
          ) : undefined
        }
      />

      <Tabs tabs={["Fidélité", "Forfaits"]} value={tab} onChange={setTab} />

      {loading ? (
        <div className="mt-4 surface p-8 text-center text-sm text-ink/50">Chargement…</div>
      ) : tab === "Fidélité" ? (
        <div className="mt-4 space-y-6">
          {program ? (
            <p className="text-xs text-ink/45">
              Règle : {program.madPerPoint} MAD = 1 point
              {program.active ? "" : " (programme inactif)"}
            </p>
          ) : null}
          {kpis ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi label="Clientes fidélisées" value={String(kpis.membersCount)} />
              <Kpi label="Points distribués" value={formatPoints(kpis.pointsDistributed)} />
              <Kpi label="Points utilisés" value={formatPoints(kpis.pointsRedeemed)} />
              <Kpi label="Récompenses utilisées" value={String(kpis.rewardsUsed)} />
            </div>
          ) : null}

          <div className="surface p-4">
            <p className="mb-3 text-sm font-medium">Classement</p>
            {ranking.length === 0 ? (
              <p className="text-sm text-ink/50">Aucun compte fidélité pour l&apos;instant.</p>
            ) : (
              <ul className="space-y-2">
                {ranking.map((r) => (
                  <li key={r.customerId} className="flex justify-between text-sm">
                    <Link href={`/customers/${r.customerId}/`} className="text-primary">
                      {r.customerName}
                    </Link>
                    <span>
                      <span className="font-mono">{formatPoints(r.lifetimePoints)}</span>
                      <span className="ml-2 text-ink/45">
                        {LOYALTY_LEVEL_LABEL[r.level as keyof typeof LOYALTY_LEVEL_LABEL] ??
                          r.level}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="surface p-4">
            <p className="mb-3 text-sm font-medium">Récompenses</p>
            {rewards.length === 0 ? (
              <p className="text-sm text-ink/50">Aucune récompense configurée.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {rewards.map((r) => (
                  <li key={r.id} className="flex justify-between border-b border-line/60 py-2">
                    <span>
                      {r.name}
                      {!r.active ? (
                        <span className="ml-2 text-xs text-ink/40">inactive</span>
                      ) : null}
                    </span>
                    <span className="font-mono text-ink/70">{formatPoints(r.pointsCost)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {packages.length === 0 ? (
            <div className="surface p-8 text-center text-sm text-ink/50">Aucun forfait.</div>
          ) : (
            packages.map((p) => {
              const pct = p.sessionTotal
                ? Math.round((p.sessionUsed / p.sessionTotal) * 100)
                : 0;
              return (
                <div key={p.id} className="surface p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <Link
                        href={`/customers/${p.customerId}/`}
                        className="text-xs text-primary"
                      >
                        {p.customerName}
                      </Link>
                    </div>
                    <span className="font-mono text-xs text-ink/50">{p.status}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded bg-line/40">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-2 text-ink/60">
                    {p.sessionUsed} / {p.sessionTotal} utilisées · {p.sessionRemaining}{" "}
                    restantes
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}

      <Drawer open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Règles fidélité">
        <div className="space-y-4 text-sm">
          <label className="block">
            <span className="mb-1.5 block font-medium">MAD pour 1 point</span>
            <Input
              type="number"
              min={0.01}
              step={0.01}
              value={madPerPoint}
              onChange={(e) => setMadPerPoint(e.target.value)}
            />
            <span className="mt-1 block text-xs text-ink/45">
              Ex. 1 = 1 MAD → 1 pt · 10 = 10 MAD → 1 pt
            </span>
          </label>
          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={submitting}
            onClick={saveProgram}
          >
            Enregistrer
          </Button>
        </div>
      </Drawer>

      <Drawer open={rewardOpen} onClose={() => setRewardOpen(false)} title="Nouvelle récompense">
        <div className="space-y-3 text-sm">
          <Input
            placeholder="Nom"
            value={rewardName}
            onChange={(e) => setRewardName(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Coût points"
            value={rewardCost}
            onChange={(e) => setRewardCost(e.target.value)}
          />
          <Select value={rewardType} onChange={(e) => setRewardType(e.target.value)}>
            <option value="DISCOUNT_FIXED">Remise MAD</option>
            <option value="DISCOUNT_PERCENT">Remise %</option>
            <option value="FREE_SERVICE">Soin offert</option>
          </Select>
          <Input
            type="number"
            placeholder="Valeur (MAD ou %)"
            value={rewardValue}
            onChange={(e) => setRewardValue(e.target.value)}
          />
          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={submitting || !rewardName}
            onClick={saveReward}
          >
            Créer
          </Button>
        </div>
      </Drawer>

      <Drawer open={pkgOpen} onClose={() => setPkgOpen(false)} title="Nouveau forfait">
        <div className="space-y-3 text-sm">
          <Select value={pkgCustomerId} onChange={(e) => setPkgCustomerId(e.target.value)}>
            <option value="">Cliente…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            value={pkgServiceId}
            onChange={(e) => {
              setPkgServiceId(e.target.value);
              const s = services.find((x) => x.id === e.target.value);
              if (s && !pkgName) setPkgName(`Forfait ${s.name}`);
            }}
          >
            <option value="">Service…</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Nom du forfait"
            value={pkgName}
            onChange={(e) => setPkgName(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Séances"
            value={pkgSessions}
            onChange={(e) => setPkgSessions(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Prix MAD"
            value={pkgPrice}
            onChange={(e) => setPkgPrice(e.target.value)}
          />
          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={submitting || !pkgCustomerId || !pkgServiceId}
            onClick={savePackage}
          >
            Créer
          </Button>
        </div>
      </Drawer>
    </motion.div>
  );
}
