"use client";

import Link from "next/link";
import { type RefObject, useState } from "react";
import {
  Building2,
  MessageCircle,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { SupplierFocusPanel } from "@/components/procurement/supplier-focus-panel";
import {
  supplierInitials,
  telHref,
  whatsappHref,
} from "@/components/procurement/supplier-helpers";
import { cn } from "@/lib/utils";
import { formatMad } from "@/modules/procurement/service";
import type { ProductListItem } from "@/types/inventory";
import type { SupplierKpis, SupplierListItem } from "@/types/procurement";

export type StatusFilter = "all" | "active" | "inactive";
type MobileView = "list" | "focus";

type Props = {
  orgName: string;
  kpis: SupplierKpis | null;
  productLinks: number;
  inactiveCount: number;
  canWrite: boolean;
  financeHidden: boolean;
  showPurchases: boolean;
  showExpenses: boolean;
  insight: string;
  searchInput: string;
  onSearchChange: (value: string) => void;
  searchRef: RefObject<HTMLInputElement>;
  status: StatusFilter;
  onStatus: (s: StatusFilter) => void;
  rows: SupplierListItem[];
  total: number;
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  selected: SupplierListItem | null;
  catalog: ProductListItem[];
  onCreate: () => void;
  onEdit: () => void;
  onArchive: () => void;
};

export function SuppliersMobile({
  orgName,
  kpis,
  productLinks,
  inactiveCount,
  canWrite,
  financeHidden,
  showPurchases,
  showExpenses,
  insight,
  searchInput,
  onSearchChange,
  searchRef,
  status,
  onStatus,
  rows,
  total,
  loading,
  selectedId,
  onSelect,
  selected,
  catalog,
  onCreate,
  onEdit,
  onArchive,
}: Props) {
  const [view, setView] = useState<MobileView>("list");

  function goList() {
    setView("list");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

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
            onClick={goList}
          >
            ← Répertoire
          </button>
          <SupplierFocusPanel
            supplierId={selected.id}
            fallback={selected}
            canWrite={canWrite}
            financeHidden={financeHidden}
            showPurchases={showPurchases}
            catalog={catalog}
            onEdit={onEdit}
            onArchive={onArchive}
          />
        </div>
      ) : (
        <div className="space-y-4 pb-8">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F6E3EF] px-3 py-1">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink/55">
                Fournisseurs
              </span>
            </div>
            <span className="truncate text-[12px] text-ink/45">{orgName}</span>
          </div>

          <div>
            <h1 className="text-[22px] font-semibold leading-tight text-ink">Partenaires & achats</h1>
            <p className="mt-1 text-[13px] text-ink/55">
              Répertoire, tarifs liés au catalogue et commandes en cours.
            </p>
          </div>

          {canWrite ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex h-12 items-center justify-center gap-1.5 rounded-lg bg-primary text-[14px] font-semibold text-white shadow-sm"
                onClick={onCreate}
              >
                <Plus className="h-5 w-5" />
                Fournisseur
              </button>
              {showPurchases ? (
                <Link
                  href="/purchases/"
                  className="flex h-12 items-center justify-center gap-1.5 rounded-lg bg-[#F0DDE9] text-[14px] font-semibold text-[#7B5900]"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Bon express
                </Link>
              ) : (
                <Link
                  href="/stock/"
                  className="flex h-12 items-center justify-center gap-1.5 rounded-lg bg-[#F0DDE9] text-[14px] font-semibold text-[#7B5900]"
                >
                  Stock
                </Link>
              )}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <KpiTile
              label="Fournisseurs"
              value={String(kpis?.supplierCount ?? 0)}
              hint={`${kpis?.activeCount ?? 0} actifs${inactiveCount ? ` · ${inactiveCount} inact.` : ""}`}
            />
            <KpiTile label="Liaisons produits" value={String(productLinks)} hint="Catalogue lié" />
            <KpiTile
              label="Commandes"
              value={String(kpis?.openOrdersCount ?? 0)}
              hint="En cours"
              accent
            />
            <KpiTile
              label="Ce mois"
              value={financeHidden ? "—" : formatMad(kpis?.monthPurchasesTotal ?? 0)}
              hint="Achats"
            />
          </div>

          <div className="rounded-xl bg-ink p-4 text-[#FEECF7] shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#FFDEA4]">
              <Sparkles className="h-4 w-4" />
              Lecture du répertoire
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-[#FEECF7]/90">{insight}</p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <span className="shrink-0 rounded-full bg-primary px-3 py-2 text-[14px] font-bold text-white">
              Fournisseurs ({kpis?.supplierCount ?? 0})
            </span>
            {showPurchases ? (
              <Link
                href="/purchases/"
                className="shrink-0 rounded-full bg-white px-3 py-2 text-[14px] font-semibold text-ink"
              >
                Commandes ({kpis?.openOrdersCount ?? 0})
              </Link>
            ) : null}
            {showExpenses ? (
              <Link
                href="/expenses/"
                className="shrink-0 rounded-full bg-white px-3 py-2 text-[14px] font-semibold text-ink"
              >
                Dépenses
              </Link>
            ) : null}
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-ink/35" />
            <input
              ref={searchRef}
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher nom, contact, téléphone…"
              className="h-12 w-full rounded-xl bg-white pl-11 pr-4 text-[13px] shadow-sm outline-none placeholder:text-ink/35"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {(
              [
                ["all", "Tous"],
                ["active", "Actifs"],
                ["inactive", "Archivés"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => onStatus(id)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold",
                  status === id ? "bg-[#F6E3EF] text-primary" : "bg-white text-ink/55",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="py-8 text-center text-[13px] text-ink/40">Chargement…</p>
          ) : rows.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-center text-[13px] text-ink/45">
              Aucun fournisseur.
            </p>
          ) : (
            <div className="space-y-3">
              {rows.map((s) => {
                const wa = whatsappHref(s.phone);
                const tel = telHref(s.phone);
                return (
                  <article
                    key={s.id}
                    className={cn(
                      "flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm",
                      selectedId === s.id && "ring-1 ring-primary/30",
                    )}
                  >
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-2 text-left"
                      onClick={() => goFocus(s.id)}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FFEFF8] text-[18px] font-bold text-primary">
                          {supplierInitials(s.name)}
                        </div>
                        <div className="min-w-0">
                          <h2 className="truncate text-[18px] font-bold text-ink">{s.name}</h2>
                          <p className="truncate text-[13px] text-ink/50">
                            {s.contactName ?? s.phone ?? s.email ?? "Sans contact"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold",
                          s.active ? "bg-emerald-100 text-emerald-800" : "bg-[#F0DDE9] text-ink/45",
                        )}
                      >
                        {s.active ? "Actif" : "Archivé"}
                      </span>
                    </button>

                    <div className="grid grid-cols-3 gap-1 text-center">
                      <MiniStat label="Réf." value={String(s.productCount)} />
                      <MiniStat label="Cmd" value={String(s.purchaseCount)} />
                      <MiniStat
                        label="Achats"
                        value={financeHidden ? "—" : formatMad(s.totalPurchased)}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      {wa ? (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          className="flex h-11 items-center justify-center gap-1 rounded-lg bg-[#25D366] text-[12px] font-bold text-white"
                        >
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp
                        </a>
                      ) : (
                        <span className="flex h-11 items-center justify-center rounded-lg bg-[#F6E3EF] text-[12px] text-ink/35">
                          —
                        </span>
                      )}
                      {tel ? (
                        <a
                          href={tel}
                          className="flex h-11 items-center justify-center gap-1 rounded-lg bg-[#F6E3EF] text-[12px] font-bold text-ink"
                        >
                          <Phone className="h-4 w-4" />
                          Appel
                        </a>
                      ) : (
                        <span className="flex h-11 items-center justify-center rounded-lg bg-[#F6E3EF] text-[12px] text-ink/35">
                          —
                        </span>
                      )}
                      {showPurchases ? (
                        <Link
                          href="/purchases/"
                          className="flex h-11 items-center justify-center gap-1 rounded-lg bg-primary text-[12px] font-bold text-white"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Commander
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="flex h-11 items-center justify-center rounded-lg bg-primary text-[12px] font-bold text-white"
                          onClick={() => goFocus(s.id)}
                        >
                          Fiche
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
              <p className="text-center text-[11px] text-ink/40">
                {rows.length} affiché{rows.length > 1 ? "s" : ""}
                {total > rows.length ? ` sur ${total}` : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KpiTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col justify-between gap-1 rounded-xl bg-white p-3 shadow-sm">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">{label}</span>
      <span className="text-[22px] font-extrabold leading-none text-ink">{value}</span>
      <span className={cn("text-[11px] text-ink/45", accent && "font-semibold text-primary")}>{hint}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#FFEFF8] p-2">
      <span className="block text-[10px] font-semibold uppercase text-ink/40">{label}</span>
      <span className="text-[12px] font-bold text-ink">{value}</span>
    </div>
  );
}