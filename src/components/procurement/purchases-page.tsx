"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ClipboardList,
  PackageCheck,
  Plus,
  Search,
} from "lucide-react";
import { useCurrentUser } from "@/components/auth/session-provider";
import { PurchaseDetailView } from "@/components/procurement/purchase-detail-view";
import { PurchaseFocusPanel } from "@/components/procurement/purchase-focus-panel";
import { PurchaseForm } from "@/components/procurement/purchase-form";
import { PurchasesPremiumHeader } from "@/components/procurement/purchases-premium-header";
import { SupplierForm } from "@/components/procurement/supplier-form";
import {
  canReceiveStatus,
  formatPurchaseDate,
  purchaseInsight,
  purchaseStatusChip,
  purchaseSummaryLine,
} from "@/components/procurement/purchase-helpers";
import { PurchasesMobile, type PurchasesTab } from "@/components/procurement/purchases-mobile";
import { Drawer } from "@/components/ui/drawer";
import { PremiumSidePanel } from "@/components/ui/premium-side-panel";
import { useToast } from "@/components/ui/toast";
import { canAccessNav, canWriteStock } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { listProducts } from "@/modules/inventory/service";
import {
  createPurchase,
  createSupplier,
  formatMad,
  listPurchases,
  listSuppliers,
  PURCHASE_STATUS_LABEL,
} from "@/modules/procurement/service";
import type { ProductListItem } from "@/types/inventory";
import type {
  CreateSupplierInput,
  PurchaseItemInput,
  PurchaseKpis,
  PurchaseListItem,
  PurchaseStatus,
  SupplierListItem,
} from "@/types/procurement";

export function PurchasesPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteStock(user.role);
  const financeHidden = user.role === "STAFF" || user.role === "CASHIER";
  const showSuppliers = canAccessNav(user.role, "suppliers");

  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<PurchasesTab>("orders");
  const [status, setStatus] = useState<PurchaseStatus | "">("");
  const [supplierId, setSupplierId] = useState("");
  const [rows, setRows] = useState<PurchaseListItem[]>([]);
  const [kpis, setKpis] = useState<PurchaseKpis | null>(null);
  const [total, setTotal] = useState(0);
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const [catalog, setCatalog] = useState<ProductListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierPrefill, setSupplierPrefill] = useState("");
  const [pickedSupplier, setPickedSupplier] = useState<{ id: string; name: string; token: number } | null>(null);
  const [supplierSubmitting, setSupplierSubmitting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const refresh = useCallback(async () => {
    try {
      const common = {
        search,
        supplierId: supplierId || undefined,
        limit: 40,
      };
      if (tab === "receipts") {
        const [ordered, partial] = await Promise.all([
          listPurchases({ ...common, status: "ORDERED" }),
          listPurchases({ ...common, status: "PARTIALLY_RECEIVED" }),
        ]);
        const merged = [...ordered.data, ...partial.data].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setRows(merged);
        setKpis(ordered.kpis);
        setTotal(ordered.kpis.awaitingReceiptCount);
      } else {
        const res = await listPurchases({
          ...common,
          status: status || undefined,
        });
        setRows(res.data);
        setKpis(res.kpis);
        setTotal(res.pagination.total);
      }
    } catch {
      toast("Impossible de charger les achats.", "error");
    }
  }, [search, status, supplierId, tab, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    Promise.all([
      listSuppliers({ active: true, limit: 100 }),
      listProducts({ active: true, limit: 100 }),
    ])
      .then(([s, p]) => {
        setSuppliers(s.data);
        setCatalog(p.data);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !rows.some((r) => r.id === selectedId)) {
      const firstOpen = rows.find((r) => canReceiveStatus(r.status));
      setSelectedId((firstOpen ?? rows[0]).id);
    }
  }, [rows, selectedId]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;
  const lowStockCount = catalog.filter((p) => p.alert === "LOW" || p.alert === "OUT").length;
  const insight = purchaseInsight(kpis, lowStockCount);

  function handleTab(next: PurchasesTab) {
    setTab(next);
    if (next === "receipts") setStatus("");
  }

  function selectSupplier(supplier: { id: string; name: string }) {
    setPickedSupplier({ id: supplier.id, name: supplier.name, token: Date.now() });
  }

  function rememberSupplier(supplier: SupplierListItem) {
    setSuppliers((current) => {
      if (current.some((row) => row.id === supplier.id)) return current;
      return [...current, supplier].sort((a, b) => a.name.localeCompare(b.name, "fr"));
    });
    selectSupplier(supplier);
  }

  function findSupplierByName(name: string) {
    const key = name.trim().toLowerCase();
    return suppliers.find((row) => row.name.trim().toLowerCase() === key) ?? null;
  }

  async function handleCreateSupplier(data: CreateSupplierInput) {
    const name = data.name.trim();
    if (!name) {
      toast("Le nom du fournisseur est obligatoire.", "error");
      return;
    }
    const existing = findSupplierByName(name);
    if (existing) {
      setPickedSupplier({ id: existing.id, name: existing.name, token: Date.now() });
      setSupplierOpen(false);
      toast("Ce fournisseur est déjà dans la liste.", "info");
      return;
    }
    setSupplierSubmitting(true);
    const result = await createSupplier({ ...data, name, active: data.active ?? true });
    setSupplierSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    rememberSupplier(result.supplier);
    setSupplierOpen(false);
    toast("Fournisseur ajouté.", "success");
  }

  async function handleCreate(payload: {
    supplierId?: string;
    supplierName?: string;
    notes?: string;
    submit: boolean;
    items: PurchaseItemInput[];
  }) {
    if (
      payload.items.length === 0 ||
      payload.items.some((l) => (!l.productId && !l.productName?.trim()) || l.quantityOrdered <= 0)
    ) {
      toast("Ajoutez au moins une ligne produit valide.", "error");
      return;
    }
    setSubmitting(true);
    let supplierId = payload.supplierId;
    const typedName = payload.supplierName?.trim() ?? "";
    if (!supplierId && typedName) {
      const existing = findSupplierByName(typedName);
      if (existing) {
        supplierId = existing.id;
      } else {
        const created = await createSupplier({ name: typedName, active: true });
        if (!created.ok) {
          setSubmitting(false);
          toast(created.error, "error");
          return;
        }
        rememberSupplier(created.supplier);
        supplierId = created.supplier.id;
      }
    }
    const result = await createPurchase({
      supplierId,
      notes: payload.notes,
      submit: payload.submit,
      items: payload.items,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    const createdProduct = payload.items.some((line) => !line.productId && line.productName?.trim());
    setDrawerOpen(false);
    setSupplierOpen(false);
    setPickedSupplier(null);
    toast(
      createdProduct
        ? "Commande enregistrée. Le nouveau produit est dans le catalogue."
        : "Commande enregistrée.",
      "success",
    );
    void refresh();
    void listProducts({ active: true, limit: 100 })
      .then((products) => setCatalog(products.data))
      .catch(() => undefined);
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      <PurchasesMobile
        orgName={user.orgName}
        kpis={kpis}
        canWrite={canWrite}
        financeHidden={financeHidden}
        insight={insight}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchRef={searchRef}
        tab={tab}
        onTab={handleTab}
        status={status}
        onStatus={setStatus}
        supplierId={supplierId}
        onSupplier={setSupplierId}
        suppliers={suppliers}
        rows={rows}
        total={total}
        loading={loading}
        selectedId={selectedId}
        onSelect={setSelectedId}
        selected={selected}
        onCreate={() => setDrawerOpen(true)}
        onReceived={() => void refresh()}
        onToast={toast}
        onEdit={() => {
          if (!selected) return;
          setEditingPurchaseId(selected.id);
          setDetailOpen(true);
        }}
      />

      <div className="hidden flex-col gap-5 lg:flex">
        <header
          className="relative flex min-h-[96px] items-center justify-between gap-4 overflow-hidden rounded-[20px] border border-[#EFD9E1] bg-[#F9E8E7] px-5 py-4 shadow-sm sm:min-h-[108px] sm:px-7"
          style={{
            backgroundImage:
              'linear-gradient(90deg,rgba(255,247,247,.92) 0%,rgba(255,239,239,.55) 42%,rgba(255,239,239,.15) 100%),url("/marketing/hero-background.png")',
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        >
          <div className="relative z-10 min-w-0">
            <h1 className="font-serif text-2xl font-bold tracking-tight text-[#58152F] sm:text-3xl">
              Achats & approvisionnements
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-5 text-[#654254]">
              Cycle fournisseur → commande → réception. Le stock n’augmente qu’au
              pointage des quantités réellement reçues.
            </p>
          </div>
          {canWrite ? (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="relative z-10 inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#AC0E4C] px-5 text-sm font-bold text-white shadow-md transition hover:bg-[#850F3C]"
            >
              <Plus size={17} />
              Nouvelle commande
            </button>
          ) : null}
        </header>

        <nav className="flex flex-wrap gap-1.5 rounded-2xl border border-[#F1E8EC] bg-white p-2 shadow-sm">
          <button
            type="button"
            onClick={() => handleTab("orders")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all",
              tab === "orders" ? "bg-[#981C52] text-white shadow-sm" : "text-[#765E6B] hover:bg-[#FAF0F5]",
            )}
          >
            <ClipboardList size={15} />
            Commandes
            <span
              className={cn(
                "rounded-full px-1.5 text-[11px] font-bold",
                tab === "orders" ? "bg-white/20 text-white" : "bg-[#FFF0F6] text-[#846A79]",
              )}
            >
              {kpis?.purchaseCount ?? 0}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleTab("receipts")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all",
              tab === "receipts" ? "bg-[#981C52] text-white shadow-sm" : "text-[#765E6B] hover:bg-[#FAF0F5]",
            )}
          >
            <PackageCheck size={15} />
            Réceptions
            <span
              className={cn(
                "rounded-full px-1.5 text-[11px] font-bold",
                tab === "receipts" ? "bg-white/20 text-white" : "bg-[#FFF0F6] text-[#846A79]",
              )}
            >
              {kpis?.awaitingReceiptCount ?? 0}
            </span>
          </button>
        </nav>

        <PurchasesPremiumHeader
          purchaseCount={kpis?.purchaseCount ?? 0}
          draftCount={kpis?.draftCount ?? 0}
          orderedCount={kpis?.orderedCount ?? 0}
          receivedCount={kpis?.receivedCount ?? 0}
          awaitingReceipt={kpis?.awaitingReceiptCount ?? 0}
          monthTotal={financeHidden ? null : formatMad(kpis?.monthTotal ?? 0)}
        />

        <div className="rounded-[18px] border border-[#F0D4A8] bg-[#FFF8E8] px-4 py-3 text-sm text-[#7A5A1E]">
          <span className="font-bold text-[#6B4A12]">Rappel important :</span>{" "}
          le stock augmente uniquement après validation des quantités réellement réceptionnées.
        </div>

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <div className="overflow-hidden rounded-[22px] border border-[#F0DDE4] bg-white shadow-sm">
              <div className="space-y-3 border-b border-[#F0DDE4] bg-[#FFF0F6] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-serif text-lg font-bold text-[#54112F]">Journal des commandes</h2>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#846A79]">
                    {total} bon{total > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
                  <div className="relative min-w-0 flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
                    <input
                      ref={searchRef}
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Rechercher une commande, un fournisseur…"
                      className="h-10 w-full rounded-xl border border-[#F0DDE4] bg-white pl-9 pr-4 text-[13px] outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tab === "orders" ? (
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as PurchaseStatus | "")}
                        className="h-10 rounded-xl border border-[#F0DDE4] bg-white px-3 text-[13px]"
                      >
                        <option value="">Statut : Tous</option>
                        <option value="DRAFT">Brouillon</option>
                        <option value="ORDERED">Commandée</option>
                        <option value="PARTIALLY_RECEIVED">Partiellement reçue</option>
                        <option value="RECEIVED">Reçue</option>
                        <option value="CANCELLED">Annulée</option>
                      </select>
                    ) : null}
                    <select
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      className="h-10 rounded-xl border border-[#F0DDE4] bg-white px-3 text-[13px]"
                    >
                      <option value="">Fournisseur : Tous</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              {loading ? (
                <p className="p-8 text-center text-sm text-ink/40">Chargement…</p>
              ) : rows.length === 0 ? (
                <p className="p-8 text-center text-sm text-ink/40">Aucune commande.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-[#FFF7FA] text-[11px] font-bold uppercase tracking-wider text-[#74334E]">
                      <tr>
                        <th className="w-10 px-3 py-3" aria-label="Sélection" />
                        <th className="px-3 py-3">N°</th>
                        <th className="px-3 py-3">Fournisseur</th>
                        <th className="px-3 py-3">Dates</th>
                        <th className="px-3 py-3">Lignes</th>
                        <th className="px-3 py-3 text-right">Total</th>
                        <th className="px-3 py-3 text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((p) => (
                        <tr
                          key={p.id}
                          className={cn(
                            "cursor-pointer border-t border-[#F0DDE4]/70 transition-colors hover:bg-[#FFF7FA]",
                            p.id === selectedId && "bg-[#FFF0F6]",
                            p.status === "PARTIALLY_RECEIVED" && p.id !== selectedId && "bg-[#FFF4E6]/60",
                          )}
                          onClick={() => setSelectedId(p.id)}
                        >
                          <td className="px-3 py-3.5">
                            <input
                              type="radio"
                              name="purchase-row"
                              checked={p.id === selectedId}
                              onChange={() => setSelectedId(p.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 accent-[#AC0E4C]"
                              aria-label={`Sélectionner ${p.number}`}
                            />
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 font-mono text-[12px] font-bold text-[#43182D]">
                            {p.number}
                          </td>
                          <td className="px-3 py-3.5">
                            {showSuppliers && p.supplierId ? (
                              <Link
                                href={`/suppliers/${p.supplierId}/`}
                                className="font-semibold text-[#AC0E4C] hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {p.supplierName}
                              </Link>
                            ) : (
                              <span className="font-semibold text-[#43182D]">{p.supplierName}</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-[12px] text-[#846A79]">
                            <div>Émise {formatPurchaseDate(p.createdAt)}</div>
                            {p.receivedAt ? (
                              <div className="font-semibold text-[#43182D]">
                                Reçue {formatPurchaseDate(p.receivedAt)}
                              </div>
                            ) : p.orderedAt ? (
                              <div className="font-semibold text-[#43182D]">
                                Commandée {formatPurchaseDate(p.orderedAt)}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-3.5 text-[#846A79]">{purchaseSummaryLine(p)}</td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-right font-bold text-[#43182D]">
                            {financeHidden ? "—" : formatMad(p.total)}
                          </td>
                          <td className="px-3 py-3.5 text-center">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold",
                                purchaseStatusChip(p.status),
                              )}
                            >
                              {PURCHASE_STATUS_LABEL[p.status]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="xl:sticky xl:top-20 xl:col-span-4">
            {selected ? (
              <PurchaseFocusPanel
                purchaseId={selected.id}
                fallback={selected}
                canWrite={canWrite}
                financeHidden={financeHidden}
                onReceived={() => void refresh()}
                onToast={toast}
                onEdit={() => {
                  setEditingPurchaseId(selected.id);
                  setDetailOpen(true);
                }}
              />
            ) : (
              <div className="rounded-[22px] border border-[#F0DDE4] bg-white p-8 text-center text-sm text-ink/40 shadow-sm">
                Sélectionnez une commande.
              </div>
            )}
          </div>
        </div>
      </div>

      <Drawer
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setEditingPurchaseId(null);
        }}
        title={editingPurchaseId && selected?.id === editingPurchaseId ? "Modifier le brouillon" : selected ? selected.number : "Fiche commande"}
        className="max-w-xl"
      >
        {selected ? (
          <PurchaseDetailView
            key={`${selected.id}-${editingPurchaseId === selected.id ? "edit" : "read"}`}
            purchaseId={selected.id}
            embedded
            startInEdit={editingPurchaseId === selected.id}
            onChanged={() => void refresh()}
          />
        ) : null}
      </Drawer>

      <PremiumSidePanel
        open={drawerOpen}
        onClose={() => {
          if (supplierOpen) {
            setSupplierOpen(false);
            return;
          }
          setDrawerOpen(false);
          setPickedSupplier(null);
        }}
        title={supplierOpen ? "Nouveau fournisseur" : "Nouvelle commande"}
        description={
          supplierOpen
            ? "Ajoutez un fournisseur à votre réseau."
            : "Créez une commande d’approvisionnement."
        }
      >
        <div className={supplierOpen ? "hidden" : undefined}>
          <PurchaseForm
            key={drawerOpen ? "open" : "closed"}
            suppliers={suppliers}
            catalog={catalog}
            submitting={submitting}
            pickedSupplier={pickedSupplier}
            onAddSupplier={(name) => {
              setSupplierPrefill(name);
              setSupplierOpen(true);
            }}
            onSubmit={(payload) => void handleCreate(payload)}
            onCancel={() => {
              setDrawerOpen(false);
              setSupplierOpen(false);
              setPickedSupplier(null);
            }}
          />
        </div>
        {supplierOpen ? (
          <SupplierForm
            key={supplierPrefill}
            initial={{ name: supplierPrefill }}
            submitting={supplierSubmitting}
            onSubmit={(data) => void handleCreateSupplier(data)}
            onCancel={() => setSupplierOpen(false)}
          />
        ) : null}
      </PremiumSidePanel>
    </div>
  );
}

