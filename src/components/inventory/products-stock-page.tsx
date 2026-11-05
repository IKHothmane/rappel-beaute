"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  History,
  Package,
  Sparkles,
} from "lucide-react";
import { InventoryPageView } from "@/components/inventory/inventory-page";
import { ProductsPageView } from "@/components/inventory/products-page";
import { cn } from "@/lib/utils";

type ProductsStockTab = "catalogue" | "stock" | "mouvements" | "inventaire" | "alertes";

const TABS: { id: ProductsStockTab; label: string; icon: typeof Package }[] = [
  { id: "catalogue", label: "Catalogue", icon: Package },
  { id: "stock", label: "Stock", icon: Boxes },
  { id: "mouvements", label: "Mouvements", icon: History },
  { id: "inventaire", label: "Inventaire", icon: ClipboardList },
  { id: "alertes", label: "Alertes", icon: AlertTriangle },
];

function parseTab(value: string | null): ProductsStockTab {
  if (value === "stock" || value === "mouvements" || value === "inventaire" || value === "alertes") {
    return value;
  }
  return "catalogue";
}

export function ProductsStockPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = useMemo(() => parseTab(searchParams.get("tab")), [searchParams]);

  function setTab(tab: ProductsStockTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "catalogue") params.delete("tab");
    else params.set("tab", tab);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#54112F] via-[#831D4A] to-[#B83E72] px-6 py-8 text-white shadow-lg sm:px-10 sm:py-10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full border-[45px] border-white/5" />
        <div className="pointer-events-none absolute bottom-[-90px] right-1/4 h-56 w-56 rounded-full bg-pink-300/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold">
            <Sparkles size={14} />
            Approvisionnement
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Produits & Stock</h1>
          <p className="mt-3 text-sm leading-7 text-pink-100">
            Gérez le catalogue, les niveaux de stock, les mouvements, l’inventaire et les alertes dans un seul
            espace.
          </p>
        </div>
      </header>

      <nav className="flex flex-wrap gap-1.5 rounded-2xl border border-[#F1E8EC] bg-white p-2 shadow-sm">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all duration-200",
                active ? "bg-[#981C52] text-white shadow-sm" : "text-[#765E6B] hover:bg-[#FAF0F5]",
              )}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {currentTab === "catalogue" ? (
        <ProductsPageView />
      ) : (
        <InventoryPageView
          key={currentTab}
          initialTab={
            currentTab === "mouvements"
              ? "mouvements"
              : currentTab === "inventaire"
                ? "inventaire"
                : currentTab === "alertes"
                  ? "alertes"
                  : "niveaux"
          }
        />
      )}
    </div>
  );
}
