"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  MessageCircle,
  Phone,
  Search,
  ShoppingCart,
} from "lucide-react";
import { useCurrentUser } from "@/components/auth/session-provider";
import { SupplierFocusPanel } from "@/components/procurement/supplier-focus-panel";
import { SupplierForm } from "@/components/procurement/supplier-form";
import { SuppliersPremiumHeader } from "@/components/procurement/suppliers-premium-header";
import {
  supplierInitials,
  supplierWhatsappMessage,
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
  const topSuppliers = useMemo(
    () =>
      [...rows]
        .sort((a, b) => b.totalPurchased - a.totalPurchased || b.purchaseCount - a.purchaseCount)
        .slice(0, 5)
        .map((s) => ({
          name: s.name,
          total: s.totalPurchased,
          orders: s.purchaseCount,
        })),
    [rows],
  );

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
        <SuppliersPremiumHeader
          supplierCount={kpis?.supplierCount ?? 0}
          activeCount={kpis?.activeCount ?? 0}
          inactiveCount={inactiveCount}
          productLinks={productLinks}
          openOrders={kpis?.openOrdersCount ?? 0}
          monthPurchases={financeHidden ? null : formatMad(kpis?.monthPurchasesTotal ?? 0)}
          canWrite={canWrite}
          topSuppliers={topSuppliers}
          financeHidden={financeHidden}
          onCreate={() => void openCreate()}
        />

        <div className="flex flex-col gap-3 rounded-[22px] border border-[#F0DDE4] bg-white p-4 shadow-sm md:flex-row md:items-center">
          <div className="relative max-w-lg flex-1">
            <Search className="absolute left-3 top-3 h-[18px] w-[18px] text-ink/35" />
            <input
              ref={searchRef}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher un fournisseur, contact, téléphone…"
              className="h-11 w-full rounded-xl bg-[#FFEFF8] pl-9 pr-4 text-[13px] outline-none placeholder:text-ink/35"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="h-11 rounded-xl bg-[#FFEFF8] px-3 text-[13px] outline-none"
          >
            <option value="all">Statut : Tous</option>
            <option value="active">Actifs</option>
            <option value="inactive">Archivés</option>
          </select>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <div className="overflow-hidden rounded-[22px] border border-[#F0DDE4] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#F0DDE4] bg-[#FFF0F6] p-4">
                <div className="flex items-center gap-2">
                  <Building2 size={20} className="text-[#AC0E4C]" />
                  <h2 className="font-serif text-lg font-bold text-[#54112F]">Répertoire partenaires</h2>
                </div>
                <span className="text-[12px] text-[#846A79]">
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
                    <thead className="bg-[#FFF0F6] text-[11px] font-bold uppercase tracking-wider text-[#74334E]">
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
                        const wa = whatsappHref(
                          s.phone,
                          supplierWhatsappMessage({
                            supplierName: s.name,
                            contactName: s.contactName,
                            orgName: user.orgName,
                          }),
                        );
                        const tel = telHref(s.phone);
                        const activeRow = s.id === selectedId;
                        return (
                          <tr
                            key={s.id}
                            className={cn(
                              "cursor-pointer border-t border-[#F0DDE4]/70 transition-colors hover:bg-[#FFF7FA]",
                              activeRow && "bg-[#FFF0F6]",
                            )}
                            onClick={() => setSelectedId(s.id)}
                          >
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FDE3ED] to-[#F0B8D0] text-[12px] font-extrabold text-[#AC0E4C]">
                                  {supplierInitials(s.name)}
                                </div>
                                <div>
                                  <span className="font-bold text-[#43182D]">{s.name}</span>
                                  {s.email ? (
                                    <p className="text-[11px] text-[#846A79]">{s.email}</p>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5">
                              <p className="font-medium text-[#43182D]">{s.contactName ?? "—"}</p>
                              <p className="text-[11px] text-[#846A79]">{s.phone ?? "—"}</p>
                            </td>
                            <td className="px-4 py-3.5">
                              <p className="font-bold text-[#43182D]">{s.productCount} réf.</p>
                              {!financeHidden ? (
                                <p className="text-[10px] font-semibold text-[#AC0E4C]">
                                  {formatMad(s.totalPurchased)}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-4 py-3.5 font-medium text-[#43182D]">{s.purchaseCount}</td>
                            <td className="px-4 py-3.5">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold",
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
                                    className="rounded-xl bg-emerald-100 p-1.5 text-emerald-800"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MessageCircle size={16} />
                                  </a>
                                ) : null}
                                {tel ? (
                                  <a
                                    href={tel}
                                    title="Appeler"
                                    className="rounded-xl bg-[#FFF0F6] p-1.5 text-[#54112F]"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Phone size={16} />
                                  </a>
                                ) : null}
                                {showPurchases ? (
                                  <Link
                                    href="/purchases/"
                                    title="Commander"
                                    className="rounded-xl bg-[#AC0E4C] p-1.5 text-white"
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

          <div className="xl:sticky xl:top-20 xl:col-span-4">
            {selected ? (
              <SupplierFocusPanel
                supplierId={selected.id}
                fallback={selected}
                orgName={user.orgName}
                canWrite={canWrite}
                financeHidden={financeHidden}
                showPurchases={showPurchases}
                catalog={catalog}
                onEdit={() => void openEdit(selected.id)}
              />
            ) : (
              <div className="rounded-[22px] border border-[#F0DDE4] bg-white p-8 text-center text-sm text-ink/40 shadow-sm">
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

