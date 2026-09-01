"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AppPageHeader } from "@/components/app/AppUi";
import { DataCard, ResponsiveTable } from "@/components/app/ResponsiveTable";
import { useCurrentUser } from "@/components/auth/session-provider";
import { CustomerForm } from "@/components/customers/customer-form";
import { CustomerKpisRow } from "@/components/customers/customer-kpis";
import { Drawer } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import { canEditCustomerMarketing, canWriteFeatureLimited } from "@/lib/rbac";
import {
  createCustomer,
  formatLastVisit,
  formatSegmentLabel,
  listCustomers,
} from "@/modules/customers/service";
import type { CustomerListItem, CustomerSegment } from "@/types/customer";

const SEGMENTS: CustomerSegment[] = ["ALL", "ACTIVE", "VIP", "NEW", "INACTIVE", "AT_RISK"];

export function CustomersPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteFeatureLimited(user.role, "customers");
  const canMarketing = canEditCustomerMarketing(user.role);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<CustomerSegment>("ALL");
  const [rows, setRows] = useState<CustomerListItem[]>([]);
  const [kpis, setKpis] = useState({ total: 0, newCount: 0, vipCount: 0, inactiveCount: 0 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await listCustomers({ search, segment, limit: 50 });
      setRows(res.data);
      setKpis(res.kpis);
    } catch {
      toast("Impossible de charger les clientes.", "error");
    }
  }, [search, segment, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function handleCreate(data: Parameters<typeof createCustomer>[0]) {
    setSubmitting(true);
    const result = await createCustomer(data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setDrawerOpen(false);
    toast("Cliente créée.", "success");
    refresh();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title="Clientes"
        description="Gérez votre clientèle et développez votre activité."
        action={
          canWrite ? (
            <button type="button" className="btn-primary" onClick={() => setDrawerOpen(true)}>
              + Cliente
            </button>
          ) : undefined
        }
      />

      <CustomerKpisRow kpis={kpis} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une cliente…"
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          {SEGMENTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSegment(s)}
              className={`rounded-lg px-3 py-1.5 text-xs ${
                segment === s
                  ? "bg-primary-light font-semibold text-primary-dark"
                  : "border border-line bg-white"
              }`}
            >
              {formatSegmentLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="surface p-8 text-center text-sm text-ink/50">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-ink/50">Aucune cliente trouvée.</div>
      ) : (
        <ResponsiveTable
          headers={["Cliente", "Téléphone", "Visites", "CA", "Dernière"]}
          minWidthClass="min-w-[720px]"
          cards={rows.map((c) => (
            <DataCard
              key={c.id}
              href={`/customers/${c.id}/`}
              title={
                <span className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-sm font-semibold text-primary">
                    {c.firstName.charAt(0)}
                  </span>
                  {c.firstName} {c.lastName}
                </span>
              }
              subtitle={c.phone}
              meta={
                <>
                  <span>{c.visits} visites</span>
                  <span className="font-mono">{c.revenue.toLocaleString("fr-MA")} MAD</span>
                  <span>Dernière : {formatLastVisit(c.lastVisitAt)}</span>
                </>
              }
            />
          ))}
        >
          {rows.map((c) => (
            <tr key={c.id} className="hover:bg-[#FBF4F6]/50">
              <td className="px-4 py-3">
                <Link href={`/customers/${c.id}/`} className="font-medium text-primary">
                  {c.firstName} {c.lastName}
                </Link>
                {c.segment === "VIP" ? (
                  <span className="ml-2 rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gold">
                    VIP
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 font-mono text-xs">{c.phone}</td>
              <td className="px-4 py-3">{c.visits}</td>
              <td className="px-4 py-3 font-mono">{c.revenue.toLocaleString("fr-MA")}</td>
              <td className="px-4 py-3">{formatLastVisit(c.lastVisitAt)}</td>
            </tr>
          ))}
        </ResponsiveTable>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Nouvelle cliente"
        side="right"
      >
        <CustomerForm
          canEditMarketing={canMarketing}
          submitting={submitting}
          onSubmit={handleCreate}
          onCancel={() => setDrawerOpen(false)}
        />
      </Drawer>
    </motion.div>
  );
}
