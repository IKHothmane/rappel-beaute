"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageCircle, Pencil, Phone, ShoppingCart, Star } from "lucide-react";
import {
  leadTimeLabel,
  supplierInitials,
  telHref,
  whatsappHref,
} from "@/components/procurement/supplier-helpers";
import { cn } from "@/lib/utils";
import { getProduct } from "@/modules/inventory/service";
import {
  formatMad,
  getSupplier,
  PURCHASE_STATUS_LABEL,
} from "@/modules/procurement/service";
import type { ProductDetail, ProductListItem } from "@/types/inventory";
import type { ProductSupplierLink, SupplierDetail, SupplierListItem } from "@/types/procurement";

type Props = {
  supplierId: string;
  fallback: SupplierListItem;
  canWrite: boolean;
  financeHidden: boolean;
  showPurchases: boolean;
  catalog: ProductListItem[];
  onEdit: () => void;
};

function stockHint(catalog: ProductListItem[], productId: string) {
  const p = catalog.find((x) => x.id === productId);
  if (!p) return null;
  if (p.alert === "OUT") return { label: `Stock : 0 (rupture)`, tone: "error" as const };
  if (p.alert === "LOW") {
    return {
      label: `Stock : ${p.stock}${p.minStock != null ? ` (min ${p.minStock})` : ""}`,
      tone: "warn" as const,
    };
  }
  return { label: `Stock : ${p.stock}`, tone: "ok" as const };
}

export function SupplierFocusPanel({
  supplierId,
  fallback,
  canWrite,
  financeHidden,
  showPurchases,
  catalog,
  onEdit,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SupplierDetail | null>(null);
  const [compare, setCompare] = useState<ProductDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    setCompare(null);
    getSupplier(supplierId)
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supplierId]);

  useEffect(() => {
    const first = detail?.products[0];
    if (!first) {
      setCompare(null);
      return;
    }
    let cancelled = false;
    getProduct(first.productId)
      .then((p) => {
        if (!cancelled && (p.suppliers?.length ?? 0) >= 2) setCompare(p);
        else if (!cancelled) setCompare(null);
      })
      .catch(() => {
        if (!cancelled) setCompare(null);
      });
    return () => {
      cancelled = true;
    };
  }, [detail]);

  const s = detail ?? fallback;
  const wa = whatsappHref(s.phone);
  const tel = telHref(s.phone);
  const preferred = (detail?.products ?? []).some((p) => p.preferred);
  const products: ProductSupplierLink[] = detail?.products ?? [];
  const purchases = detail?.recentPurchases ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-[#E31C5F] text-[16px] font-bold text-white shadow-sm">
              {supplierInitials(s.name)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="text-[18px] font-bold leading-snug text-ink">{s.name}</h3>
                {preferred ? <Star className="h-4 w-4 fill-[#7B5900] text-[#7B5900]" /> : null}
              </div>
              <p className="mt-0.5 text-[13px] text-ink/55">
                {s.contactName ?? "Contact non renseigné"}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-bold",
                    s.active ? "bg-emerald-100 text-emerald-800" : "bg-[#F0DDE9] text-ink/45",
                  )}
                >
                  {s.active ? "Actif" : "Archivé"}
                </span>
                {s.productCount > 0 ? (
                  <span className="text-[11px] font-semibold text-ink/55">
                    {s.productCount} réf.
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          {canWrite ? (
            <button
              type="button"
              onClick={onEdit}
              title="Modifier"
              className="rounded-lg bg-[#FCE9F4] p-2 text-ink/50 hover:text-primary"
            >
              <Pencil size={16} />
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] text-[13px] font-semibold text-white"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          ) : (
            <span className="flex h-10 items-center justify-center rounded-lg bg-[#F0DDE9] text-[13px] text-ink/40">
              Pas de WhatsApp
            </span>
          )}
          {tel ? (
            <a
              href={tel}
              className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#FCE9F4] text-[13px] font-semibold text-ink"
            >
              <Phone className="h-4 w-4" />
              {s.contactName ? `Appeler` : "Appeler"}
            </a>
          ) : (
            <span className="flex h-10 items-center justify-center rounded-lg bg-[#F0DDE9] text-[13px] text-ink/40">
              Pas de téléphone
            </span>
          )}
        </div>

        <div className="space-y-1.5 rounded-xl bg-[#FFEFF8] p-3 text-[12px]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">Coordonnées</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <p className="text-ink/45">Téléphone</p>
              <p className="font-medium text-ink">{s.phone ?? "—"}</p>
            </div>
            <div>
              <p className="text-ink/45">Email</p>
              <p className="truncate font-medium text-ink">{s.email ?? "—"}</p>
            </div>
            {detail?.address ? (
              <div className="sm:col-span-2">
                <p className="text-ink/45">Adresse</p>
                <p className="font-medium text-ink">{detail.address}</p>
              </div>
            ) : null}
          </div>
          {detail?.notes ? (
            <p className="pt-1 text-ink/55">{detail.notes}</p>
          ) : null}
        </div>

        {loading && !detail ? (
          <p className="text-[12px] text-ink/40">Chargement de la fiche…</p>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[14px] font-bold text-ink">Produits liés & tarifs</h4>
            <Link
              href={`/suppliers/${s.id}/`}
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              Fiche complète
            </Link>
          </div>
          {products.length === 0 ? (
            <p className="rounded-xl bg-[#FFEFF8] p-3 text-[12px] text-ink/50">
              Aucun produit lié. Ouvrez la fiche pour rattacher une référence.
            </p>
          ) : (
            <div className="space-y-2">
              {products.slice(0, 4).map((p) => {
                const stock = stockHint(catalog, p.productId);
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-xl p-2.5",
                      stock?.tone === "error" ? "bg-[#FFDAD6]/60" : "bg-[#FFEFF8]",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-ink">
                        {p.productName}
                        {p.preferred ? (
                          <Star className="ml-1 inline h-3 w-3 fill-[#7B5900] text-[#7B5900]" />
                        ) : null}
                      </p>
                      <p className="text-[11px] text-ink/50">
                        {financeHidden ? "Prix masqué" : `Achat : ${formatMad(p.purchasePrice)}`}
                        {leadTimeLabel(p.leadTimeDays) ? ` · ${leadTimeLabel(p.leadTimeDays)}` : ""}
                        {stock ? ` · ${stock.label}` : ""}
                      </p>
                    </div>
                    {showPurchases ? (
                      <Link
                        href="/purchases/"
                        className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-white"
                      >
                        Commander
                      </Link>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!financeHidden ? (
          <div className="rounded-xl bg-[#FFEFF8] p-3">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-bold text-ink">Achats cumulés</span>
              <span className="font-extrabold text-ink">{formatMad(s.totalPurchased)}</span>
            </div>
            <p className="mt-1 text-[11px] text-ink/45">
              {s.purchaseCount} commande{s.purchaseCount > 1 ? "s" : ""}
              {detail?.lastPurchaseAt
                ? ` · dernière le ${new Date(detail.lastPurchaseAt).toLocaleDateString("fr-MA")}`
                : ""}
            </p>
          </div>
        ) : null}

        {compare && compare.suppliers.length >= 2 && !financeHidden ? (
          <div className="space-y-2">
            <h4 className="text-[14px] font-bold text-ink">Tarifs croisés — {compare.name}</h4>
            <div className="space-y-1.5">
              {compare.suppliers.map((src) => (
                <div
                  key={src.supplierId}
                  className="flex items-center justify-between rounded-xl bg-[#FFEFF8] px-3 py-2"
                >
                  <div>
                    <p className="text-[13px] font-bold text-ink">{src.supplierName}</p>
                    {src.preferred ? (
                      <p className="text-[10px] font-semibold uppercase text-[#7B5900]">Préféré</p>
                    ) : null}
                  </div>
                  <p className="text-[15px] font-extrabold text-primary">{formatMad(src.purchasePrice)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <h4 className="text-[14px] font-bold text-ink">Commandes récentes</h4>
          {purchases.length === 0 ? (
            <p className="text-[12px] text-ink/45">Aucune commande enregistrée.</p>
          ) : (
            <div className="space-y-2">
              {purchases.slice(0, 4).map((p) => (
                <div key={p.id} className="flex items-start gap-2 rounded-lg bg-[#FFEFF8] p-2">
                  <ShoppingCart className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-ink">
                      {p.number}
                      {!financeHidden ? ` · ${formatMad(p.total)}` : ""}
                    </p>
                    <p className="text-[11px] text-ink/50">
                      {PURCHASE_STATUS_LABEL[p.status]}
                      {p.orderedAt
                        ? ` · ${new Date(p.orderedAt).toLocaleDateString("fr-MA")}`
                        : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
