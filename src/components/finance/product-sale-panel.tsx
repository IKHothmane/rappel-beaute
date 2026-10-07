"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Search, ShoppingBag, Tag } from "lucide-react";
import { filterPosCatalog, productStockState } from "@/components/pos/pos-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatMad, PAYMENT_METHOD_LABEL } from "@/modules/finance/service";
import {
  createPosSaleApi,
  listPosProductsApi,
  newPosIdempotencyKey,
} from "@/modules/pos/service";
import { listPromotions } from "@/modules/promo/service";
import { PAYMENT_METHODS, type PaymentMethod } from "@/types/finance";
import type { PosProductItem, PosSaleDetail } from "@/types/pos";
import {
  PROMOTION_TYPE_LABEL,
  type PromotionListItem,
} from "@/types/promo";

type CartLine = { product: PosProductItem; quantity: number };

export type ProductAddonCart = {
  lines: { productId: string; quantity: number }[];
  total: number;
  discount: number;
  promoCode: string | null;
};

type ProductSalePanelProps = {
  disabled?: boolean;
  /** Si false et méthode Espèces : blocage comme au POS. */
  cashOpen?: boolean;
  /** Embarqué dans l’encaissement service : panier seul, sans bouton Vendre. */
  embedded?: boolean;
  /** Remet le panier à zéro quand la valeur change (ex. ouverture du tiroir). */
  resetToken?: number | string;
  onCartChange?: (cart: ProductAddonCart) => void;
  onSold?: (sale: PosSaleDetail) => void;
  onError: (message: string) => void;
};

function promoDiscount(promo: PromotionListItem, amount: number): number {
  if (amount <= 0) return 0;
  if (promo.minAmount != null && amount < promo.minAmount) return 0;
  const value = promo.value ?? 0;
  let discount = 0;
  if (promo.type === "PERCENTAGE") {
    discount = Math.round(amount * (value / 100) * 100) / 100;
  } else if (
    promo.type === "FIXED_AMOUNT" ||
    promo.type === "HAPPY_HOUR" ||
    promo.type === "PACKAGE"
  ) {
    discount = Math.min(amount, value);
  } else {
    return 0;
  }
  return Math.max(0, Math.min(amount, Math.round(discount * 100) / 100));
}

function promoHint(promo: PromotionListItem): string {
  if (promo.type === "PERCENTAGE" && promo.value != null) return `−${promo.value} %`;
  if (promo.value != null) return `−${formatMad(promo.value)}`;
  return PROMOTION_TYPE_LABEL[promo.type];
}

export function ProductSalePanel({
  disabled,
  cashOpen = true,
  embedded = false,
  resetToken,
  onCartChange,
  onSold,
  onError,
}: ProductSalePanelProps) {
  const [products, setProducts] = useState<PosProductItem[]>([]);
  const [promos, setPromos] = useState<PromotionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [promoCode, setPromoCode] = useState("");
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCart([]);
    setSearch("");
    setPromoCode("");
    setSelectedPromoId(null);
  }, [resetToken]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [list, promoRes] = await Promise.all([
          listPosProductsApi(),
          listPromotions({ status: "ACTIVE", limit: 80 }).catch(() => ({
            data: [] as PromotionListItem[],
          })),
        ]);
        if (cancelled) return;
        setProducts(list);
        setPromos(
          promoRes.data.filter(
            (promo) =>
              Boolean(promo.code?.trim()) &&
              promo.type !== "FREE_SERVICE" &&
              !promo.serviceId,
          ),
        );
      } catch {
        if (!cancelled) onError("Impossible de charger les produits.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const catalog = useMemo(() => filterPosCatalog(products, search, ""), [products, search]);
  const subtotal = useMemo(
    () =>
      Math.round(
        cart.reduce((sum, line) => sum + line.product.salePrice * line.quantity, 0) * 100,
      ) / 100,
    [cart],
  );

  const selectedPromo =
    promos.find((promo) => promo.id === selectedPromoId) ??
    promos.find((promo) => promo.code?.toUpperCase() === promoCode.trim().toUpperCase()) ??
    null;

  const discount = selectedPromo ? promoDiscount(selectedPromo, subtotal) : 0;
  const total = Math.round((subtotal - discount) * 100) / 100;

  const onCartChangeRef = useRef(onCartChange);
  onCartChangeRef.current = onCartChange;
  useEffect(() => {
    onCartChangeRef.current?.({
      lines: cart.map((line) => ({
        productId: line.product.id,
        quantity: line.quantity,
      })),
      total,
      discount,
      promoCode: selectedPromo?.code ?? null,
    });
  }, [cart, total, discount, selectedPromo]);

  const filteredPromos = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return promos;
    return promos.filter(
      (promo) =>
        promo.code?.toLowerCase().includes(q) ||
        promo.name.toLowerCase().includes(q),
    );
  }, [promos, search]);

  function addProduct(product: PosProductItem) {
    if (!(product.salePrice > 0)) {
      onError("Ce produit n’a pas de prix de vente.");
      return;
    }
    if (product.stock <= 0) {
      onError("Stock insuffisant.");
      return;
    }
    setCart((prev) => {
      const existing = prev.find((line) => line.product.id === product.id);
      if (!existing) return [...prev, { product, quantity: 1 }];
      if (existing.quantity + 1 > product.stock) {
        onError("Stock insuffisant.");
        return prev;
      }
      return prev.map((line) =>
        line.product.id === product.id
          ? { ...line, quantity: line.quantity + 1 }
          : line,
      );
    });
  }

  function setQty(productId: string, quantity: number) {
    setCart((prev) =>
      prev
        .map((line) => {
          if (line.product.id !== productId) return line;
          const next = Math.max(0, Math.min(line.product.stock, quantity));
          return { ...line, quantity: next };
        })
        .filter((line) => line.quantity > 0),
    );
  }

  function applyPromo(promo: PromotionListItem) {
    if (cart.length === 0) {
      onError("Ajoutez des produits avant d’appliquer un code promo.");
      return;
    }
    const amount = promoDiscount(promo, subtotal);
    if (amount <= 0) {
      onError(
        promo.minAmount != null && subtotal < promo.minAmount
          ? `Minimum ${formatMad(promo.minAmount)} pour ce code.`
          : "Ce code ne s’applique pas à ce panier.",
      );
      return;
    }
    setSelectedPromoId(promo.id);
    setPromoCode(promo.code ?? "");
  }

  function applyTypedCode() {
    const code = promoCode.trim();
    if (!code) {
      setSelectedPromoId(null);
      return;
    }
    const match = promos.find((promo) => promo.code?.toUpperCase() === code.toUpperCase());
    if (!match) {
      onError("Code promo introuvable ou inactif.");
      setSelectedPromoId(null);
      return;
    }
    applyPromo(match);
  }

  async function handleSell() {
    if (disabled || submitting || embedded) return;
    if (cart.length === 0) {
      onError("Ajoutez au moins un produit.");
      return;
    }
    if (method === "CASH" && !cashOpen) {
      onError("Ouvrez la caisse pour encaisser en espèces.");
      return;
    }
    setSubmitting(true);
    const result = await createPosSaleApi({
      lines: cart.map((line) => ({
        productId: line.product.id,
        quantity: line.quantity,
      })),
      paymentMethod: method,
      discountTotal: discount > 0 ? discount : 0,
      notes: selectedPromo?.code
        ? `Vente POS · Promo: ${selectedPromo.code}`
        : null,
      idempotencyKey: newPosIdempotencyKey(),
    });
    setSubmitting(false);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    setCart([]);
    setSearch("");
    setPromoCode("");
    setSelectedPromoId(null);
    onSold?.(result.sale);
  }

  return (
    <div className={cn("space-y-4", embedded && "rounded-xl border border-dashed border-primary/25 bg-white p-3")}>
      {embedded ? (
        <p className="text-[12px] font-bold uppercase tracking-wider text-ink/45">
          Ajouter des produits (optionnel)
        </p>
      ) : null}
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">
          {embedded ? "Produits à vendre avec le service" : "Rechercher un produit ou un code promo"}
        </span>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, SKU, marque, code promo…"
            className="pl-9"
            disabled={disabled}
          />
        </div>
      </label>

      <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl bg-[#FFEFF8] p-2">
        <p className="px-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-ink/45">
          Produits ({catalog.length})
        </p>
        {loading ? (
          <p className="p-3 text-center text-[12px] text-ink/45">Chargement…</p>
        ) : catalog.length === 0 ? (
          <p className="p-3 text-center text-[12px] text-ink/45">Aucun produit trouvé.</p>
        ) : (
          catalog.map((product) => {
            const state = productStockState(product);
            const noPrice = !(product.salePrice > 0);
            return (
              <button
                key={product.id}
                type="button"
                disabled={disabled || state === "out" || noPrice}
                onClick={() => addProduct(product)}
                className="flex w-full items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-2 text-left text-[13px] transition hover:bg-primary/5 disabled:opacity-40"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <ShoppingBag size={13} className="shrink-0 text-primary" />
                    <span className="truncate">{product.name}</span>
                  </span>
                  <span className="mt-0.5 block text-[11px] text-ink/45">
                    Stock {product.stock}
                    {state === "low" ? " · bas" : ""}
                    {state === "out" ? " · rupture" : ""}
                    {noPrice ? " · sans prix" : ""}
                  </span>
                </span>
                <span className="shrink-0 font-bold">
                  {noPrice ? "—" : formatMad(product.salePrice)}
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-dashed border-primary/25 bg-white p-2">
        <p className="flex items-center gap-1 px-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-ink/45">
          <Tag size={12} className="text-primary" />
          Codes promo
        </p>
        {loading ? (
          <p className="p-2 text-center text-[12px] text-ink/45">Chargement…</p>
        ) : filteredPromos.length === 0 ? (
          <p className="p-2 text-center text-[12px] text-ink/45">Aucun code promo actif.</p>
        ) : (
          filteredPromos.map((promo) => {
            const active = selectedPromoId === promo.id;
            return (
              <button
                key={promo.id}
                type="button"
                disabled={disabled}
                onClick={() => applyPromo(promo)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition",
                  active ? "bg-primary text-white" : "bg-[#FFEFF8] hover:bg-primary/10",
                )}
              >
                <span className="min-w-0">
                  <span className="block font-mono text-[12px] font-bold tracking-wide">
                    {promo.code}
                  </span>
                  <span className={cn("mt-0.5 block truncate text-[11px]", active ? "text-white/80" : "text-ink/50")}>
                    {promo.name} · {promoHint(promo)}
                  </span>
                </span>
                <span className={cn("shrink-0 text-[11px] font-semibold", active ? "text-white" : "text-primary")}>
                  {active ? "Appliqué" : "Appliquer"}
                </span>
              </button>
            );
          })
        )}
        <div className="flex gap-2 pt-1">
          <Input
            value={promoCode}
            onChange={(e) => {
              setPromoCode(e.target.value);
              if (!e.target.value.trim()) setSelectedPromoId(null);
            }}
            placeholder="Saisir un code"
            disabled={disabled}
            className="font-mono uppercase"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || !promoCode.trim()}
            onClick={applyTypedCode}
          >
            OK
          </Button>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-ink/45">Panier</p>
        {cart.length === 0 ? (
          <p className="rounded-lg bg-[#F3F4F6] px-3 py-3 text-[12px] text-ink/50">
            Aucun produit. Cliquez pour ajouter.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {cart.map((line) => (
              <li
                key={line.product.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-[#FFEFF8] px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">{line.product.name}</p>
                  <p className="text-[11px] text-ink/45">
                    {formatMad(line.product.salePrice)} × {line.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white"
                    onClick={() => setQty(line.product.id, line.quantity - 1)}
                    disabled={disabled}
                    aria-label="Moins"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center text-[13px] font-bold">{line.quantity}</span>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white"
                    onClick={() => setQty(line.product.id, line.quantity + 1)}
                    disabled={disabled}
                    aria-label="Plus"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {embedded ? (
        cart.length > 0 ? (
          <div className="flex items-center justify-between rounded-lg bg-[#FFEFF8] px-3 py-2 text-[13px]">
            <span className="text-ink/55">
              Produits{discount > 0 ? ` · promo −${formatMad(discount)}` : ""}
            </span>
            <span className="font-extrabold text-primary">{formatMad(total)}</span>
          </div>
        ) : null
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Méthode</span>
              <Select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                disabled={disabled}
              >
                {PAYMENT_METHODS.map((item) => (
                  <option key={item} value={item}>
                    {PAYMENT_METHOD_LABEL[item]}
                  </option>
                ))}
              </Select>
            </label>
            <div className="flex flex-col justify-end rounded-lg bg-[#FFEFF8] px-3 py-2">
              {discount > 0 ? (
                <>
                  <span className="text-[11px] text-ink/45">
                    Brut {formatMad(subtotal)} · promo −{formatMad(discount)}
                  </span>
                  <span className="text-[18px] font-extrabold text-primary">{formatMad(total)}</span>
                </>
              ) : (
                <>
                  <span className="text-[11px] text-ink/45">Total</span>
                  <span className="text-[18px] font-extrabold text-primary">{formatMad(total)}</span>
                </>
              )}
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={disabled || submitting || cart.length === 0}
            onClick={() => void handleSell()}
          >
            {submitting ? "Vente…" : `Vendre · ${formatMad(total)}`}
          </Button>
        </>
      )}
    </div>
  );
}
