"use client";

import Link from "next/link";
import { type RefObject, useState } from "react";
import { Plus, Search, ShoppingCart, Sparkles, Wallet } from "lucide-react";
import { PurchaseFocusPanel } from "@/components/procurement/purchase-focus-panel";
import {
  formatPurchaseDate,
  purchaseStatusChip,
  purchaseSummaryLine,
} from "@/components/procurement/purchase-helpers";
import { cn } from "@/lib/utils";
import { formatMad, PURCHASE_STATUS_LABEL } from "@/modules/procurement/service";
import type { PurchaseKpis, PurchaseListItem, PurchaseStatus } from "@/types/procurement";

export type PurchasesTab = "orders" | "receipts";
type MobileView = "list" | "focus";

type Props = {
  orgName: string;
  kpis: PurchaseKpis | null;
  canWrite: boolean;
  financeHidden: boolean;
  showExpenses: boolean;
  insight: string;
  searchInput: string;
  onSearchChange: (value: string) => void;
  searchRef: RefObject<HTMLInputElement>;
  tab: PurchasesTab;
  onTab: (t: PurchasesTab) => void;
  status: PurchaseStatus | "";
  onStatus: (s: PurchaseStatus | "") => void;
  supplierId: string;
  onSupplier: (id: string) => void;
  suppliers: { id: string; name: string }[];
  rows: PurchaseListItem[];
  total: number;
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  selected: PurchaseListItem | null;
  onCreate: () => void;
  onReceived: () => void;
  onToast: (msg: string, kind?: "success" | "error" | "info") => void;
  onOpenFull?: () => void;
};

export function PurchasesMobile({
  orgName,
  kpis,
  canWrite,
  financeHidden,
  showExpenses,
  insight,
  searchInput,
  onSearchChange,
  searchRef,
  tab,
  onTab,
  status,
  onStatus,
  supplierId,
  onSupplier,
  suppliers,
  rows,
  total,
  loading,
  selectedId,
  onSelect,
  selected,
  onCreate,
  onReceived,
  onToast,
  onOpenFull,
}: Props) {
  const [view, setView] = useState<MobileView>("list");

  function goFocus(id: string) {
    onSelect(id);
    setView("focus");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  return (
    <div className="lg:hidden">
      {view === "focus" && selected ? (
        <div className="space-y-3 pb-8">
          <button
            type="button"
            className="text-[13px] font-semibold text-primary"
            onClick={() => {
              setView("list");
              window.scrollTo({ top: 0, behavior: "instant" });
            }}
          >
            ← Journal
          </button>
          <PurchaseFocusPanel
            purchaseId={selected.id}
            fallback={selected}
            canWrite={canWrite}
            financeHidden={financeHidden}
            onReceived={onReceived}
            onToast={onToast}
            onOpenFull={onOpenFull}
          />
        </div>
      ) : (
        <div className="space-y-4 pb-8">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink/45">
              {orgName}
            </span>
          </div>
          <div>
            <h1 className="text-[22px] font-semibold leading-tight text-ink">Achats & appro</h1>
            <p className="mt-1 text-[13px] text-ink/55">Commandes fournisseurs et réceptions stock.</p>
          </div>

          {canWrite ? (
            <button
              type="button"
              className="flex h-12 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-[14px] font-semibold text-white shadow-sm"
              onClick={onCreate}
            >
              <Plus className="h-5 w-5" />
              Nouvelle commande
            </button>
          ) : null}

          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => onTab("orders")}
              className={cn(
                "shrink-0 rounded-full px-3 py-2 text-[14px] font-bold",
                tab === "orders" ? "bg-primary text-white" : "bg-white text-ink",
              )}
            >
              Commandes ({kpis?.purchaseCount ?? 0})
            </button>
            <button
              type="button"
              onClick={() => onTab("receipts")}
              className={cn(
                "shrink-0 rounded-full px-3 py-2 text-[14px] font-bold",
                tab === "receipts" ? "bg-primary text-white" : "bg-white text-ink",
              )}
            >
              Réceptions ({kpis?.awaitingReceiptCount ?? 0})
            </button>
            {showExpenses ? (
              <Link href="/expenses/" className="shrink-0 rounded-full bg-white px-3 py-2 text-[14px] font-semibold text-ink">
                Dépenses
              </Link>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <KpiMini label="Commandes" value={String(kpis?.purchaseCount ?? 0)} hint="Journal" />
            <KpiMini label="Brouillons" value={String(kpis?.draftCount ?? 0)} hint="À envoyer" />
            <KpiMini label="Commandées" value={String(kpis?.orderedCount ?? 0)} hint="Chez fournisseur" />
            <KpiMini label="Reçues" value={String(kpis?.receivedCount ?? 0)} hint="Stock pointé" />
            <KpiMini
              label="Ce mois"
              value={financeHidden ? "—" : formatMad(kpis?.monthTotal ?? 0)}
              hint="Hors annulées"
            />
            <KpiMini
              label="À réceptionner"
              value={String(kpis?.awaitingReceiptCount ?? 0)}
              hint="Ouvertes"
              alert={(kpis?.awaitingReceiptCount ?? 0) > 0}
            />
          </div>

          <div className="rounded-xl bg-ink p-4 text-[#FEECF7] shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#FFDEA4]">
              <Sparkles className="h-4 w-4" />
              Lecture du journal
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-[#FEECF7]/90">{insight}</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-ink/35" />
            <input
              ref={searchRef}
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="N° commande, fournisseur…"
              className="h-12 w-full rounded-xl bg-white pl-11 pr-4 text-[13px] shadow-sm outline-none placeholder:text-ink/35"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto">
            <select
              value={status}
              onChange={(e) => onStatus(e.target.value as PurchaseStatus | "")}
              className="h-9 shrink-0 rounded-lg bg-white px-3 text-[11px] font-semibold"
            >
              <option value="">Statut : Tous</option>
              <option value="DRAFT">Brouillon</option>
              <option value="ORDERED">Commandée</option>
              <option value="PARTIALLY_RECEIVED">Partielle</option>
              <option value="RECEIVED">Reçue</option>
              <option value="CANCELLED">Annulée</option>
            </select>
            <select
              value={supplierId}
              onChange={(e) => onSupplier(e.target.value)}
              className="h-9 shrink-0 rounded-lg bg-white px-3 text-[11px] font-semibold"
            >
              <option value="">Fournisseur</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="py-8 text-center text-[13px] text-ink/40">Chargement…</p>
          ) : rows.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-center text-[13px] text-ink/45">
              Aucune commande.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-semibold text-ink">Commandes récentes</h2>
                <span className="text-[11px] font-bold text-primary">{total}</span>
              </div>
              {rows.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => goFocus(p.id)}
                  className={cn(
                    "flex w-full flex-col gap-2 rounded-xl bg-white p-3 text-left shadow-sm",
                    selectedId === p.id && "ring-1 ring-primary/30",
                    p.status === "PARTIALLY_RECEIVED" && "bg-[#FFDAD6]/20",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-[12px] font-bold text-primary">{p.number}</p>
                      <p className="truncate text-[16px] font-bold text-ink">{p.supplierName}</p>
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", purchaseStatusChip(p.status))}>
                      {PURCHASE_STATUS_LABEL[p.status]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-ink/50">
                    <span>
                      {purchaseSummaryLine(p)}
                      {formatPurchaseDate(p.createdAt) ? ` · ${formatPurchaseDate(p.createdAt)}` : ""}
                    </span>
                    <span className="text-[16px] font-extrabold text-ink">
                      {financeHidden ? "—" : formatMad(p.total)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-[11px] text-ink/40">
            <ShoppingCart className="h-3.5 w-3.5" />
            <Link href="/suppliers/" className="font-semibold text-primary">
              Fournisseurs
            </Link>
            <span>→</span>
            <span className="font-semibold text-ink">Achats</span>
            <span>→</span>
            <Link href="/stock/" className="hover:text-primary">
              Stock
            </Link>
            {showExpenses ? (
              <>
                <span>→</span>
                <Link href="/expenses/" className="hover:text-primary">
                  <Wallet className="mr-0.5 inline h-3 w-3" />
                  Dépenses
                </Link>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiMini({
  label,
  value,
  hint,
  alert,
}: {
  label: string;
  value: string;
  hint: string;
  alert?: boolean;
}) {
  return (
    <div className={cn("flex flex-col justify-between rounded-xl p-2 shadow-sm", alert ? "bg-[#FFDAD6]/60" : "bg-white")}>
      <span className="truncate text-[10px] font-semibold uppercase text-ink/45">{label}</span>
      <span className={cn("text-[18px] font-extrabold leading-tight text-ink", alert && "text-[#BA1A1A]")}>{value}</span>
      <span className="truncate text-[10px] text-ink/45">{hint}</span>
    </div>
  );
}
