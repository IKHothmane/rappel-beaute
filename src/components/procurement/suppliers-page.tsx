"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  MessageCircle,
  Package,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useCurrentUser } from "@/components/auth/session-provider";
import { SupplierFocusPanel } from "@/components/procurement/supplier-focus-panel";
import { SupplierForm } from "@/components/procurement/supplier-form";
import {
  supplierInitials,
  supplierInsight,
  telHref,
  whatsappHref,
} from "@/components/procurement/supplier-helpers";
import { SuppliersMobile, type StatusFilter } from "@/components/procurement/suppliers-mobile";
import { Drawer } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import { canAccessNav, canWriteStock } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { listProducts } from "@/modules/inventory/service";
import {
  createSupplier,
  formatMad,
  getSupplier,
  listSuppliers,
  updateSupplier,
} from "@/modules/procurement/service";
import type { ProductListItem } from "@/types/inventory";
import type { CreateSupplierInput, SupplierDetail, SupplierKpis, SupplierListItem } from "@/types/procurement";

export function SuppliersPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteStock(user.role);
  const financeHidden = user.role === "STAFF" || user.role === "CASHIER";
  const showPurchases = canAccessNav(user.role, "purchases");
  const showExpenses = canAccessNav(user.role, "expenses");

  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [rows, setRows] = useState<SupplierListItem[]>([]);
  const [kpis, setKpis] = useState<SupplierKpis | null>(null);
  const [total, setTotal] = useState(0);
  const [catalog, setCatalog] = useState<ProductListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const refresh = useCallback(async () => {
    try {
      const active = status === "all" ? null : status === "active";
      const [res, products] = await Promise.all([
        listSuppliers({ search, active, limit: 50 }),
        listProducts({ limit: 100, active: true }).catch(() => null),
      ]);
      setRows(res.data);
      setKpis(res.kpis);
      setTotal(res.pagination.total);
      if (products) setCatalog(products.data);
    } catch {
      toast("Impossible de charger les fournisseurs.", "error");
    }
  }, [search, status, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !rows.some((r) => r.id === selectedId)) {
      setSelectedId(rows[0].id);
    }
  }, [rows, selectedId]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;
  const productLinks = useMemo(() => rows.reduce((n, s) => n + s.productCount, 0), [rows]);
  const inactiveCount = Math.max(0, (kpis?.supplierCount ?? 0) - (kpis?.activeCount ?? 0));
  const insight = useMemo(() => supplierInsight(rows), [rows]);

  async function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }

  async function openEdit(id?: string) {
    const sid = id ?? selectedId;
    if (!sid) return;
    try {
      const detail = await getSupplier(sid);
      setEditing(detail);
      setDrawerOpen(true);
    } catch {
      toast("Impossible de charger la fiche.", "error");
    }
  }

  async function handleSubmit(data: CreateSupplierInput) {
    setSubmitting(true);
    const result = editing
      ? await updateSupplier(editing.id, data)
      : await createSupplier(data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setDrawerOpen(false);
    setEditing(null);
    toast(editing ? "Fournisseur mis à jour." : "Fournisseur créé.", "success");
    refresh();
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      <SuppliersMobile
        orgName={user.orgName}
        kpis={kpis}
        productLinks={productLinks}
        inactiveCount={inactiveCount}
        canWrite={canWrite}
        financeHidden={financeHidden}
        showPurchases={showPurchases}
        showExpenses={showExpenses}
        insight={insight}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchRef={searchRef}
        status={status}
        onStatus={setStatus}
        rows={rows}
        total={total}
        loading={loading}
        selectedId={selectedId}
        onSelect={setSelectedId}
        selected={selected}
        catalog={catalog}
        onCreate={() => void openCreate()}
        onEdit={() => void openEdit()}
      />

      <div className="hidden flex-col gap-5 lg:flex">
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="flex items-center gap-2 font-display text-[28px] font-bold leading-9 tracking-tight text-ink">
                <Building2 size={26} className="text-primary" />
                Fournisseurs & relations commerciales
              </h1>
              <p className="mt-1 max-w-3xl text-[15px] text-ink/50">
                Répertoire partenaires, tarifs liés au catalogue et suivi des commandes.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {showPurchases ? (
                <Link
                  href="/purchases/"
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-white px-3.5 text-[13px] font-semibold text-ink shadow-sm"
                >
                  <ShoppingCart size={16} className="text-[#7B5900]" />
                  Bon de commande
                </Link>
              ) : null}
              {canWrite ? (
                <button
                  type="button"
                  onClick={() => void openCreate()}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-[13px] font-semibold text-white shadow-md"
                >
                  <Plus size={18} />
                  Nouveau fournisseur
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[14px] font-semibold text-white shadow-sm">
            <Building2 size={16} />
            Fournisseurs ({kpis?.supplierCount ?? 0})
          </span>
          {showPurchases ? (
            <Link
              href="/purchases/"
              className="inline-flex items-center gap-2 rounded-lg bg-[#FFEFF8] px-4 py-2 text-[14px] font-semibold text-ink hover:bg-[#FCE9F4]"
            >
              <ShoppingCart size={16} />
              Commandes ({kpis?.openOrdersCount ?? 0})
            </Link>
          ) : null}
          {showExpenses ? (
            <Link
              href="/expenses/"
              className="inline-flex items-center gap-2 rounded-lg bg-[#FFEFF8] px-4 py-2 text-[14px] font-semibold text-ink hover:bg-[#FCE9F4]"
            >
              <Wallet size={16} />
              Dépenses
            </Link>
          ) : null}
        </div>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-6">
          <KpiCard
            label="Fournisseurs"
            value={String(kpis?.supplierCount ?? 0)}
            hint={`${kpis?.activeCount ?? 0} actifs · ${inactiveCount} inact.`}
            icon={Building2}
          />
          <KpiCard
            label="Produits liés"
            value={String(productLinks)}
            hint="Liaisons catalogue"
            icon={Package}
          />
          <KpiCard
            label="Commandes en cours"
            value={String(kpis?.openOrdersCount ?? 0)}
            hint="Commandées ou en réception"
            icon={ShoppingCart}
            tone="primary"
          />
          <KpiCard
            label="Achats ce mois"
            value={financeHidden ? "—" : formatMad(kpis?.monthPurchasesTotal ?? 0)}
            hint="Hors commandes annulées"
            icon={Wallet}
          />
          <KpiCard
            label="Commandes cumulées"
            value={String(rows.reduce((n, s) => n + s.purchaseCount, 0))}
            hint="Sur la liste affichée"
            icon={ShoppingCart}
          />
          <KpiCard
            label="Archivés"
            value={String(inactiveCount)}
            hint="Toujours dans le répertoire"
            icon={Building2}
          />
        </section>

        <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FFDEA4]/60 text-[#7B5900]">
              <Sparkles size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#7B5900]">
                Lecture du répertoire
              </p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink">{insight}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm md:flex-row md:items-center">
          <div className="relative max-w-lg flex-1">
            <Search className="absolute left-3 top-3 h-[18px] w-[18px] text-ink/35" />
            <input
              ref={searchRef}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher un fournisseur, contact, téléphone…"
              className="h-11 w-full rounded-lg bg-[#FFEFF8] pl-9 pr-4 text-[13px] outline-none placeholder:text-ink/35"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="h-11 rounded-lg bg-[#FFEFF8] px-3 text-[13px] outline-none"
          >
            <option value="all">Statut : Tous</option>
            <option value="active">Actifs</option>
            <option value="inactive">Archivés</option>
          </select>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="flex items-center justify-between bg-[#FFEFF8] p-4">
                <div className="flex items-center gap-2">
                  <Building2 size={20} className="text-primary" />
                  <h2 className="text-[18px] font-bold text-ink">Répertoire partenaires</h2>
                </div>
                <span className="text-[12px] text-ink/45">
                  {rows.length} affiché{rows.length > 1 ? "s" : ""}
                  {total > rows.length ? ` sur ${total}` : ""}
                </span>
              </div>

              {loading ? (
                <p className="p-8 text-center text-sm text-ink/40">Chargement…</p>
              ) : rows.length === 0 ? (
                <p className="p-8 text-center text-sm text-ink/40">Aucun fournisseur.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-[#FCE9F4] text-[11px] font-bold uppercase tracking-wider text-ink/45">
                      <tr>
                        <th className="px-4 py-3">Fournisseur</th>
                        <th className="px-4 py-3">Contact</th>
                        <th className="px-4 py-3">Références</th>
                        <th className="px-4 py-3">Commandes</th>
                        <th className="px-4 py-3">Statut</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((s) => {
                        const wa = whatsappHref(s.phone);
                        const tel = telHref(s.phone);
                        const activeRow = s.id === selectedId;
                        return (
                          <tr
                            key={s.id}
                            className={cn(
                              "cursor-pointer border-t border-[#F0DDE9]/60 transition-colors",
                              activeRow ? "bg-[#FFEFF8]/80" : "hover:bg-[#FFEFF8]/50",
                            )}
                            onClick={() => setSelectedId(s.id)}
                          >
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F6E3EF] text-[12px] font-extrabold text-primary">
                                  {supplierInitials(s.name)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-ink">{s.name}</span>
                                  </div>
                                  {s.email ? (
                                    <p className="text-[11px] text-ink/45">{s.email}</p>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5">
                              <p className="font-medium text-ink">{s.contactName ?? "—"}</p>
                              <p className="text-[11px] text-ink/45">{s.phone ?? "—"}</p>
                            </td>
                            <td className="px-4 py-3.5">
                              <p className="font-bold text-ink">{s.productCount} réf.</p>
                              {!financeHidden ? (
                                <p className="text-[10px] text-primary">{formatMad(s.totalPurchased)}</p>
                              ) : null}
                            </td>
                            <td className="px-4 py-3.5 font-medium">{s.purchaseCount}</td>
                            <td className="px-4 py-3.5">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                                  s.active
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-[#F0DDE9] text-ink/45",
                                )}
                              >
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full",
                                    s.active ? "bg-emerald-600" : "bg-ink/30",
                                  )}
                                />
                                {s.active ? "Actif" : "Archivé"}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center justify-end gap-1">
                                {wa ? (
                                  <a
                                    href={wa}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="WhatsApp"
                                    className="rounded-lg bg-emerald-100 p-1.5 text-emerald-800"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MessageCircle size={16} />
                                  </a>
                                ) : null}
                                {tel ? (
                                  <a
                                    href={tel}
                                    title="Appeler"
                                    className="rounded-lg bg-[#F6E3EF] p-1.5 text-ink"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Phone size={16} />
                                  </a>
                                ) : null}
                                {showPurchases ? (
                                  <Link
                                    href="/purchases/"
                                    title="Commander"
                                    className="rounded-lg bg-primary p-1.5 text-white"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ShoppingCart size={16} />
                                  </Link>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 xl:col-span-4">
            {selected ? (
              <SupplierFocusPanel
                supplierId={selected.id}
                fallback={selected}
                canWrite={canWrite}
                financeHidden={financeHidden}
                showPurchases={showPurchases}
                catalog={catalog}
                onEdit={() => void openEdit(selected.id)}
              />
            ) : (
              <div className="rounded-2xl bg-white p-8 text-center text-sm text-ink/40 shadow-sm">
                Sélectionnez un fournisseur.
              </div>
            )}
          </div>
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        title={editing ? "Modifier le fournisseur" : "Nouveau fournisseur"}
      >
        <SupplierForm
          key={editing?.id ?? "new"}
          initial={editing ?? undefined}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => {
            setDrawerOpen(false);
            setEditing(null);
          }}
        />
      </Drawer>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Building2;
  tone?: "primary";
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between text-ink/45">
        <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
        <span className="rounded-lg bg-[#FFEFF8] p-1.5 text-primary">
          <Icon size={18} />
        </span>
      </div>
      <div className="mt-3">
        <p className="text-[28px] font-extrabold leading-none text-ink">{value}</p>
        <p className={cn("mt-1 text-[12px] text-ink/45", tone === "primary" && "font-semibold text-primary")}>
          {hint}
        </p>
      </div>
    </div>
  );
}
