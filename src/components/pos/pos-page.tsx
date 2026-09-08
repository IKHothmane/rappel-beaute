"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppPageHeader } from "@/components/app/AppUi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  createPosSaleApi,
  listPosProductsApi,
  newPosIdempotencyKey,
  searchPosCustomersApi,
} from "@/modules/pos/service";
import type { PosProductItem } from "@/types/pos";
import { PRODUCT_CATEGORY_LABEL, type ProductCategory } from "@/types/inventory";
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from "@/types/finance";

type CartLine = { product: PosProductItem; quantity: number };

function mad(n: number) {
  return `${n.toLocaleString("fr-MA", { maximumFractionDigits: 2 })} MAD`;
}

export function PosPageView() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<PosProductItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [customerQ, setCustomerQ] = useState("");
  const [customerHits, setCustomerHits] = useState<
    { id: string; name: string; phone: string }[]
  >([]);
  const [customer, setCustomer] = useState<{
    id: string;
    name: string;
    phone: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const refreshProducts = useCallback(async () => {
    try {
      const data = await listPosProductsApi({
        search: search || undefined,
        category: category || undefined,
      });
      setProducts(data);
    } catch {
      toast("Impossible de charger les produits.", "error");
    }
  }, [search, category, toast]);

  useEffect(() => {
    setLoading(true);
    refreshProducts().finally(() => setLoading(false));
  }, [refreshProducts]);

  useEffect(() => {
    if (customerQ.trim().length < 2) {
      setCustomerHits([]);
      return;
    }
    const t = setTimeout(() => {
      searchPosCustomersApi(customerQ)
        .then((r) => setCustomerHits(r.data))
        .catch(() => setCustomerHits([]));
    }, 250);
    return () => clearTimeout(t);
  }, [customerQ]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return Array.from(set);
  }, [products]);

  /** Favoris = produits en stock, sans filtre recherche (accès rapide caisse) */
  const favorites = useMemo(() => {
    if (search.trim() || category) return [];
    return products.filter((p) => p.stock > 0).slice(0, 6);
  }, [products, search, category]);

  const subtotal = cart.reduce((s, l) => s + l.product.salePrice * l.quantity, 0);
  const discountNum = Math.min(subtotal, Math.max(0, Number(discount) || 0));
  const total = Math.round((subtotal - discountNum) * 100) / 100;
  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);

  function addToCart(p: PosProductItem) {
    setCart((prev) => {
      const hit = prev.find((l) => l.product.id === p.id);
      const nextQty = (hit?.quantity ?? 0) + 1;
      if (nextQty > p.stock) {
        toast("Stock insuffisant.", "error");
        return prev;
      }
      if (hit) {
        return prev.map((l) =>
          l.product.id === p.id ? { ...l, quantity: nextQty } : l,
        );
      }
      return [...prev, { product: p, quantity: 1 }];
    });
  }

  function setQty(productId: string, quantity: number) {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.product.id !== productId) return l;
          if (quantity > l.product.stock) {
            toast("Stock insuffisant.", "error");
            return l;
          }
          return { ...l, quantity };
        })
        .filter((l) => l.quantity > 0),
    );
  }

  async function handleCheckout() {
    if (cart.length === 0) {
      toast("Panier vide.", "error");
      return;
    }
    setSubmitting(true);
    const result = await createPosSaleApi({
      lines: cart.map((l) => ({
        productId: l.product.id,
        quantity: l.quantity,
      })),
      paymentMethod: method,
      customerId: customer?.id ?? null,
      discountTotal: discountNum,
      idempotencyKey: newPosIdempotencyKey(),
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast(`Vente ${result.sale.invoiceNumber} encaissée — ${mad(result.sale.total)}`, "success");
    setCart([]);
    setDiscount("");
    setCustomer(null);
    setCustomerQ("");
    setMobileCartOpen(false);
    refreshProducts();
  }

  const cartPanel = (
    <div className="flex h-full flex-col">
      <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Panier</p>
      <p className="mt-1 text-xs text-ink/50">
        Cliente : {customer ? customer.name : "Aucune (passage)"}
      </p>

      <div className="mt-3 space-y-2">
        <Input
          placeholder="Rechercher une cliente…"
          value={customerQ}
          onChange={(e) => setCustomerQ(e.target.value)}
        />
        {customerHits.length > 0 ? (
          <ul className="max-h-28 overflow-y-auto rounded-lg border border-line text-sm">
            {customerHits.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-ink/[0.03]"
                  onClick={() => {
                    setCustomer(c);
                    setCustomerQ("");
                    setCustomerHits([]);
                  }}
                >
                  {c.name} · {c.phone}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {customer ? (
          <button
            type="button"
            className="text-xs text-ink/50 underline"
            onClick={() => setCustomer(null)}
          >
            Vente anonyme
          </button>
        ) : null}
      </div>

      <ul className="mt-4 flex-1 space-y-2 overflow-y-auto text-sm">
        {cart.length === 0 ? (
          <li className="text-ink/45">Aucun produit</li>
        ) : (
          cart.map((l) => (
            <li key={l.product.id} className="flex items-start justify-between gap-2 border-b border-line/60 pb-2">
              <div className="min-w-0">
                <p className="font-medium">{l.product.name}</p>
                <p className="text-xs text-ink/45">{mad(l.product.salePrice)}</p>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded border border-line px-2"
                    onClick={() => setQty(l.product.id, l.quantity - 1)}
                  >
                    −
                  </button>
                  <span className="font-mono text-xs">{l.quantity}</span>
                  <button
                    type="button"
                    className="rounded border border-line px-2"
                    onClick={() => setQty(l.product.id, l.quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              <span className="shrink-0 font-mono font-semibold">
                {mad(l.product.salePrice * l.quantity)}
              </span>
            </li>
          ))
        )}
      </ul>

      <div className="mt-4 space-y-2 border-t border-line pt-3 text-sm">
        <div className="flex justify-between">
          <span className="text-ink/55">Sous-total</span>
          <span className="font-mono">{mad(subtotal)}</span>
        </div>
        <label className="flex items-center justify-between gap-2">
          <span className="text-ink/55">Remise</span>
          <Input
            className="w-24 text-right"
            type="number"
            min={0}
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
        </label>
        <div className="flex justify-between text-base font-semibold">
          <span>TOTAL</span>
          <span className="font-mono">{mad(total)}</span>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {(["CASH", "CARD", "TRANSFER", "CHECK"] as PaymentMethod[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                method === m
                  ? "border-primary bg-primary-light text-primary-dark"
                  : "border-line bg-white text-ink/60"
              }`}
            >
              {PAYMENT_METHOD_LABEL[m]}
            </button>
          ))}
        </div>

        <Button
          type="button"
          className="mt-2 w-full"
          disabled={submitting || cart.length === 0}
          onClick={handleCheckout}
        >
          {submitting ? "Encaissement…" : "Encaisser"}
        </Button>
        <Link href="/cash-register/" className="block text-center text-xs text-ink/45 underline">
          Ouvrir / fermer la caisse
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <AppPageHeader
        title="POS Produits"
        description="Vente produits · facture · paiement · stock (ledger)."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <Input
            placeholder="Rechercher un produit…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory("")}
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                !category ? "border-primary bg-primary-light" : "border-line"
              }`}
            >
              Tous
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`rounded-lg border px-3 py-1.5 text-xs ${
                  category === c ? "border-primary bg-primary-light" : "border-line"
                }`}
              >
                {PRODUCT_CATEGORY_LABEL[c as ProductCategory] ?? c}
              </button>
            ))}
          </div>

          {favorites.length > 0 ? (
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ink/40">
                Favoris
              </p>
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                {favorites.map((p) => (
                  <button
                    key={`fav-${p.id}`}
                    type="button"
                    onClick={() => addToCart(p)}
                    className="shrink-0 rounded-lg border border-line bg-white px-3 py-2 text-left text-xs"
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="mt-0.5 block font-mono text-ink/55">{mad(p.salePrice)}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {loading ? (
            <p className="text-sm text-ink/50">Chargement…</p>
          ) : products.length === 0 ? (
            <div className="surface p-6 text-sm text-ink/55">
              Aucun produit vendable. Activez « vendable » et un prix de vente sur la fiche produit.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToCart(p)}
                  disabled={p.stock <= 0}
                  className="surface p-4 text-left transition hover:border-primary disabled:opacity-40"
                >
                  <div className="mb-3 flex h-16 items-center justify-center rounded-lg bg-ink/[0.04] font-display text-2xl text-ink/25">
                    {p.name.charAt(0)}
                  </div>
                  <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
                  <p className="mt-1 font-mono text-sm font-semibold">{mad(p.salePrice)}</p>
                  <p className="text-[10px] text-ink/45">Stock {p.stock}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="surface hidden p-4 lg:block lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-hidden">
          {cartPanel}
        </aside>
      </div>

      {/* Mobile bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white p-3 lg:hidden">
        <Button type="button" className="w-full" onClick={() => setMobileCartOpen(true)}>
          Panier ({cartCount}) · {mad(total)}
        </Button>
      </div>

      {mobileCartOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-ink/40 lg:hidden">
          <div className="max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-4">
            <div className="mb-2 flex justify-end">
              <button type="button" className="text-sm text-ink/50" onClick={() => setMobileCartOpen(false)}>
                Fermer
              </button>
            </div>
            {cartPanel}
          </div>
        </div>
      ) : null}
    </>
  );
}
