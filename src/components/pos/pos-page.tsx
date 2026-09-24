"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Barcode,
  CreditCard,
  Landmark,
  Package,
  ShoppingBag,
  Sparkles,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useCurrentUser } from "@/components/auth/session-provider";
import {
  categoryCounts,
  filterPosCatalog,
  findBySku,
  formatPosTime,
  posDayKpis,
  productStockState,
} from "@/components/pos/pos-helpers";
import { PosMobile } from "@/components/pos/pos-mobile";
import { Drawer } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import { canAccessNav, canWriteCashRegister } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { getCustomer } from "@/modules/customers/service";
import { formatMad, getCashRegister, PAYMENT_METHOD_LABEL } from "@/modules/finance/service";
import { getCustomerLoyalty, LOYALTY_LEVEL_LABEL } from "@/modules/loyalty/service";
import {
  createPosSaleApi,
  listPosProductsApi,
  listPosSalesApi,
  newPosIdempotencyKey,
  searchPosCustomersApi,
} from "@/modules/pos/service";
import type { PaymentMethod } from "@/types/finance";
import { PRODUCT_UNIT_LABEL, type ProductUnit } from "@/types/inventory";
import type { PosProductItem, PosSaleDetail } from "@/types/pos";

type CartLine = { product: PosProductItem; quantity: number };
type Customer = { id: string; name: string; phone: string };

const POS_METHODS: PaymentMethod[] = ["CASH", "CARD", "TRANSFER", "CHECK", "GIFT_CARD"];

export function PosPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const searchParams = useSearchParams();
  const canWrite = canWriteCashRegister(user.role);
  const showCash = canAccessNav(user.role, "cash-register");
  const showLoyalty = canAccessNav(user.role, "loyalty");

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<PosProductItem[]>([]);
  const [sales, setSales] = useState<PosSaleDetail[]>([]);
  const [cashOpen, setCashOpen] = useState(false);
  const [cashHint, setCashHint] = useState("Caisse fermée");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [cashGiven, setCashGiven] = useState("");
  const [customerQ, setCustomerQ] = useState("");
  const [customerHits, setCustomerHits] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loyaltyLine, setLoyaltyLine] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [lastSale, setLastSale] = useState<PosSaleDetail | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const customerRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [catalog, daySalesRes, cash] = await Promise.all([
        listPosProductsApi(),
        listPosSalesApi({ from: today, to: today, limit: 30 }).catch(() => ({
          data: [] as PosSaleDetail[],
          kpis: { revenue: 0, salesCount: 0, productsSold: 0, averageBasket: 0 },
        })),
        showCash ? getCashRegister().catch(() => null) : Promise.resolve(null),
      ]);
      setProducts(catalog);
      setSales(daySalesRes.data);
      const open = cash?.session?.status === "OPEN";
      setCashOpen(Boolean(open));
      if (open && cash?.session) {
        setCashHint(
          `Ouverte ${formatPosTime(cash.session.openedAt)} · fond ${formatMad(cash.session.openingFloat)}`,
        );
      } else {
        setCashHint("Caisse fermée");
      }
    } catch {
      toast("Impossible de charger le POS.", "error");
    }
  }, [showCash, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const id = searchParams.get("customerId");
    if (!id) return;
    getCustomer(id)
      .then(({ customer }) => {
        setCustomer({
          id: customer.id,
          name: `${customer.firstName} ${customer.lastName}`.trim(),
          phone: customer.phone,
        });
      })
      .catch(() => undefined);
  }, [searchParams]);

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

  useEffect(() => {
    if (!customer || !showLoyalty) {
      setLoyaltyLine(null);
      return;
    }
    getCustomerLoyalty(customer.id)
      .then((view) => {
        const pts = view.account?.balance ?? 0;
        const level = view.account ? LOYALTY_LEVEL_LABEL[view.account.level] : null;
        setLoyaltyLine(
          pts > 0
            ? `Fidélité ${pts} pts${level ? ` · ${level}` : ""}`
            : level
              ? `Fidélité ${level}`
              : null,
        );
      })
      .catch(() => setLoyaltyLine(null));
  }, [customer, showLoyalty]);

  const visible = useMemo(
    () => filterPosCatalog(products, search, category),
    [products, search, category],
  );
  const counts = categoryCounts(products);
  const retail = visible.filter((p) => p.category === "VENTE");
  const other = visible.filter((p) => p.category !== "VENTE");
  const kpis = useMemo(() => posDayKpis(sales), [sales]);

  const subtotal = cart.reduce((s, l) => s + l.product.salePrice * l.quantity, 0);
  const discountNum = Math.min(subtotal, Math.max(0, Number(discount) || 0));
  const total = Math.round((subtotal - discountNum) * 100) / 100;
  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);
  const given = Number(cashGiven) || 0;
  const change = method === "CASH" && given > 0 ? Math.max(0, Math.round((given - total) * 100) / 100) : 0;

  function addToCart(p: PosProductItem) {
    setCart((prev) => {
      const hit = prev.find((l) => l.product.id === p.id);
      const nextQty = (hit?.quantity ?? 0) + 1;
      if (nextQty > p.stock) {
        toast("Stock insuffisant.", "error");
        return prev;
      }
      if (hit) {
        return prev.map((l) => (l.product.id === p.id ? { ...l, quantity: nextQty } : l));
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

  function onSearchSubmit() {
    const hit = findBySku(products, search);
    if (hit) {
      addToCart(hit);
      setSearch("");
      toast(`${hit.name} ajouté.`, "success");
    }
  }

  function pickCustomer(c: Customer) {
    setCustomer(c);
    setCustomerQ("");
    setCustomerHits([]);
  }

  function openPay() {
    if (cart.length === 0) {
      toast("Panier vide.", "error");
      return;
    }
    if (method === "CASH") setCashGiven(String(total));
    setPayOpen(true);
  }

  async function handleCheckout() {
    if (!canWrite) return;
    if (cart.length === 0) {
      toast("Panier vide.", "error");
      return;
    }
    if (method === "CASH" && !cashOpen) {
      toast("Ouvrez la caisse pour encaisser en espèces.", "error");
      return;
    }
    setSubmitting(true);
    const result = await createPosSaleApi({
      lines: cart.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
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
    toast(`Vente ${result.sale.invoiceNumber} — ${formatMad(result.sale.total)}`, "success");
    setLastSale(result.sale);
    setCart([]);
    setDiscount("");
    setCashGiven("");
    setCustomer(null);
    setCustomerQ("");
    setPayOpen(false);
    setMobileCartOpen(false);
    refresh();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "F4") {
        e.preventDefault();
        setCustomer(null);
        window.setTimeout(() => customerRef.current?.focus(), 0);
      } else if (e.key === "F8") {
        e.preventDefault();
        openPay();
      } else if (e.key === "Escape") {
        setPayOpen(false);
        setMobileCartOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, method, cashOpen]);

  const ticketNo = kpis.count + 1;
  const cartList = (
    <ul className="max-h-60 space-y-1.5 overflow-y-auto">
      {cart.length === 0 ? (
        <li className="py-6 text-center text-[13px] text-ink/45">Aucun article</li>
      ) : (
        cart.map((l) => {
          const state = productStockState(l.product);
          return (
            <li key={l.product.id} className="flex items-center justify-between gap-2 rounded-lg bg-[#FFEFF8] p-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1 truncate text-[14px] font-semibold">
                  <ShoppingBag size={14} className="shrink-0 text-primary" />
                  <span className="truncate">{l.product.name}</span>
                </p>
                <p className={cn("text-[11px]", state === "low" ? "font-medium text-[#BA1A1A]" : "text-ink/50")}>
                  {formatMad(l.product.salePrice)}
                  {state === "low" ? " · Alerte stock" : ` · stock ${l.product.stock}`}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center rounded bg-white px-1 shadow-sm">
                  <button type="button" className="px-1.5 py-0.5 text-sm font-bold text-ink/50" onClick={() => setQty(l.product.id, l.quantity - 1)}>
                    −
                  </button>
                  <span className="w-5 text-center text-[13px] font-bold">{l.quantity}</span>
                  <button type="button" className="px-1.5 py-0.5 text-sm font-bold text-ink/50" onClick={() => setQty(l.product.id, l.quantity + 1)}>
                    +
                  </button>
                </div>
                <span className="w-16 text-right text-[13px] font-bold">{formatMad(l.product.salePrice * l.quantity)}</span>
                <button type="button" className="text-ink/35 hover:text-[#BA1A1A]" onClick={() => setQty(l.product.id, 0)} aria-label="Retirer">
                  <X size={16} />
                </button>
              </div>
            </li>
          );
        })
      )}
    </ul>
  );

  return (
    <>
      <PosMobile
        cashOpen={cashOpen}
        cashHint={cashHint}
        kpis={kpis}
        search={search}
        onSearch={setSearch}
        onSearchSubmit={onSearchSubmit}
        category={category}
        onCategory={setCategory}
        products={products}
        catalog={products}
        loading={loading}
        customer={customer}
        customerQ={customerQ}
        onCustomerQ={setCustomerQ}
        customerHits={customerHits}
        onPickCustomer={pickCustomer}
        onAnonymous={() => setCustomer(null)}
        loyaltyLine={loyaltyLine}
        cartCount={cartCount}
        total={total}
        onAdd={addToCart}
        onOpenCart={() => {
          if (cart.length === 0) {
            toast("Panier vide.", "error");
            return;
          }
          setMobileCartOpen(true);
        }}
        ticketNo={ticketNo}
        customerRef={customerRef}
      />

      <div className="hidden space-y-4 lg:block">
        <section className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[22px] font-semibold tracking-tight">
                Point de Vente Express (POS)
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0DDE9] px-2.5 py-1 text-[11px] font-semibold">
                <span className="relative flex h-2 w-2">
                  {cashOpen ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7B5900] opacity-60" /> : null}
                  <span className={cn("relative inline-flex h-2 w-2 rounded-full", cashOpen ? "bg-[#7B5900]" : "bg-ink/30")} />
                </span>
                {cashHint}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[13px] text-ink/55">
              <span>
                <strong className="text-primary">{formatMad(kpis.revenue)}</strong> CA Jour
              </span>
              <span className="text-ink/25">•</span>
              <span>
                <strong className="text-ink">{kpis.count}</strong> Ventes
              </span>
              <span className="text-ink/25">•</span>
              <span>
                <strong className="text-[#7B5900]">{kpis.count ? formatMad(kpis.average) : "—"}</strong> Panier Moyen
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded bg-[#FCE9F4] px-2 py-1">
              <kbd className="rounded bg-white px-1 font-bold text-primary shadow-sm">F2</kbd> Recherche
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-[#FCE9F4] px-2 py-1">
              <kbd className="rounded bg-white px-1 font-bold text-primary shadow-sm">F4</kbd> Cliente
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-[#FCE9F4] px-2 py-1">
              <kbd className="rounded bg-white px-1 font-bold text-primary shadow-sm">F8</kbd> Encaissement
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-[#FCE9F4] px-2 py-1">
              <kbd className="rounded bg-white px-1 font-bold text-ink/40 shadow-sm">ESC</kbd> Fermer
            </span>
          </div>
        </section>

        <form
          className="flex items-center rounded-xl bg-white p-1.5 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit();
          }}
        >
          <Barcode className="ml-3 h-6 w-6 text-primary" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Scanner code-barres, chercher un produit ou une cliente… (F2)"
            className="h-11 flex-1 bg-transparent px-3 text-[15px] outline-none placeholder:text-ink/35"
          />
          <span className="mr-2 hidden rounded bg-[#FFDEA4] px-2 py-1 text-[11px] font-bold text-[#5D4200] sm:inline">
            Entrée = SKU exact
          </span>
        </form>

        <div className="grid grid-cols-12 items-start gap-4">
          <div className="col-span-7 min-w-0 space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setCategory("")}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[14px] font-semibold",
                  !category ? "bg-primary text-white" : "bg-white text-ink/60 shadow-sm",
                )}
              >
                Tous
                <span className="rounded bg-white/20 px-1.5 text-[11px]">{products.length}</span>
              </button>
              {counts.map((c) => (
                <button
                  key={c.category}
                  type="button"
                  onClick={() => setCategory(c.category)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[14px] font-semibold",
                    category === c.category ? "bg-primary text-white" : "bg-white text-ink/60 shadow-sm",
                  )}
                >
                  {c.label}
                  <span className={cn("rounded px-1.5 text-[11px]", category === c.category ? "bg-white/20" : "bg-[#FCE9F4]")}>
                    {c.count}
                  </span>
                </button>
              ))}
            </div>

            {loading ? (
              <p className="rounded-xl bg-white p-8 text-center text-sm text-ink/50">Chargement…</p>
            ) : visible.length === 0 ? (
              <p className="rounded-xl bg-white p-8 text-center text-sm text-ink/50">
                Aucun produit vendable. Activez « vendable » et un prix de vente.
              </p>
            ) : (
              <>
                {other.length > 0 ? (
                  <ProductGrid
                    title="Prestations & catalogue"
                    hint="Sélection immédiate"
                    icon={Sparkles}
                    items={other}
                    onAdd={addToCart}
                  />
                ) : null}
                {retail.length > 0 ? (
                  <ProductGrid
                    title="Cosmétiques & revente comptoir"
                    hint="Inventaire direct"
                    icon={Package}
                    items={retail}
                    onAdd={addToCart}
                  />
                ) : null}
              </>
            )}
          </div>

          <aside className="sticky top-4 col-span-5 space-y-2">
            <div className="rounded-xl bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">Fiche cliente associée</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-primary"
                    onClick={() => {
                      setCustomer(null);
                      window.setTimeout(() => customerRef.current?.focus(), 0);
                    }}
                  >
                    Changer (F4)
                  </button>
                  {customer ? (
                    <button type="button" className="text-[12px] font-semibold text-ink/50" onClick={() => setCustomer(null)}>
                      Anonyme
                    </button>
                  ) : null}
                </div>
              </div>
              {customer ? (
                <div className="flex items-center gap-3 rounded-lg bg-[#FFEFF8] p-2.5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-[14px] font-bold text-white">
                    {customer.name
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-bold">{customer.name}</p>
                    {customer.phone ? <p className="text-[12px] text-ink/55">{customer.phone}</p> : null}
                    {loyaltyLine ? <p className="mt-0.5 text-[12px] font-semibold text-[#7B5900]">{loyaltyLine}</p> : null}
                  </div>
                </div>
              ) : (
                <>
                  <input
                    ref={customerRef}
                    value={customerQ}
                    onChange={(e) => setCustomerQ(e.target.value)}
                    placeholder="Rechercher une cliente (2 caractères)…"
                    className="h-10 w-full rounded-lg bg-[#FFEFF8] px-3 text-[13px] outline-none"
                  />
                  {customerHits.length > 0 ? (
                    <ul className="mt-1 max-h-28 overflow-y-auto rounded-lg border border-[#F0DDE9] text-[13px]">
                      {customerHits.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-[#FFEFF8]"
                            onClick={() => pickCustomer(c)}
                          >
                            {c.name}
                            {c.phone ? ` · ${c.phone}` : ""}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )}
            </div>

            <div className="rounded-xl bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[18px] font-semibold">
                  Ticket N° {ticketNo}{" "}
                  <span className="text-[12px] font-normal text-ink/45">
                    ({cartCount} article{cartCount !== 1 ? "s" : ""})
                  </span>
                </h2>
                {cart.length > 0 ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#BA1A1A]"
                    onClick={() => setCart([])}
                  >
                    <Trash2 size={14} />
                    Vider
                  </button>
                ) : null}
              </div>
              {cartList}
              <div className="mt-3 space-y-1 border-t border-[#F0DDE9] pt-3 text-[13px]">
                <div className="flex justify-between text-ink/55">
                  <span>Total brut</span>
                  <span className="font-semibold text-ink">{formatMad(subtotal)}</span>
                </div>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-ink/55">Remise</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="h-8 w-24 rounded-lg bg-[#FFEFF8] px-2 text-right text-[13px] outline-none"
                  />
                </label>
                {discountNum > 0 ? (
                  <div className="flex justify-between font-semibold text-primary">
                    <span>Remises déduites</span>
                    <span>−{formatMad(discountNum)}</span>
                  </div>
                ) : null}
                <div className="flex items-end justify-between pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ink/40">Net à payer</span>
                  <span className="text-[28px] font-extrabold tracking-tight">
                    {formatMad(total).replace(" MAD", "")} <span className="text-[18px] text-primary">DH</span>
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={!canWrite || cart.length === 0}
                onClick={openPay}
                className="mt-3 flex h-14 w-full items-center justify-between rounded-xl bg-gradient-to-r from-[#E31C5F] to-primary px-4 text-white shadow-lg shadow-primary/20 disabled:opacity-40"
              >
                <span className="flex items-center gap-2 text-[15px] font-extrabold uppercase tracking-wide">
                  <Wallet size={22} />
                  Encaisser le ticket
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-[20px] font-extrabold">{formatMad(total)}</span>
                  <kbd className="rounded bg-white/20 px-1.5 py-0.5 text-[11px] font-bold">F8</kbd>
                </span>
              </button>
              {showCash ? (
                <Link href="/cash-register/" className="mt-2 block text-center text-[12px] font-semibold text-primary hover:underline">
                  Caisse & registre
                </Link>
              ) : null}
            </div>
          </aside>
        </div>
      </div>

      <Drawer open={mobileCartOpen} onClose={() => setMobileCartOpen(false)} title="Ticket" side="bottom">
        <div className="space-y-3 pb-4">
          {cartList}
          <div className="flex justify-between text-[14px] font-semibold">
            <span>Net</span>
            <span>{formatMad(total)}</span>
          </div>
          <label className="flex items-center justify-between gap-2 text-[13px]">
            Remise
            <input
              type="number"
              min={0}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="h-9 w-24 rounded-lg bg-[#FFEFF8] px-2 text-right"
            />
          </label>
          <button
            type="button"
            disabled={!canWrite || cart.length === 0}
            onClick={() => {
              setMobileCartOpen(false);
              openPay();
            }}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-[14px] font-bold text-white"
          >
            Encaisser · {formatMad(total)}
          </button>
        </div>
      </Drawer>

      {payOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between bg-[#FFEFF8] px-5 py-4">
              <div>
                <h3 className="text-[18px] font-bold">Règlement & encaissement</h3>
                <p className="text-[12px] text-ink/55">
                  {customer ? customer.name : "Passage"}
                  {cartCount ? ` · ${cartCount} article${cartCount > 1 ? "s" : ""}` : ""}
                </p>
              </div>
              <button type="button" className="rounded-lg p-2 hover:bg-white" onClick={() => setPayOpen(false)} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-5 overflow-y-auto p-5 md:grid-cols-12">
              <div className="space-y-4 md:col-span-7">
                <div className="flex items-center justify-between rounded-xl bg-[#FCE9F4] p-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase text-ink/40">Total</p>
                    <p className="text-[22px] font-black">{formatMad(total)}</p>
                  </div>
                  {discountNum > 0 ? (
                    <p className="text-[13px] text-primary">Remise {formatMad(discountNum)}</p>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {POS_METHODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl p-3 text-[12px] font-bold",
                        method === m ? "bg-primary text-white" : "bg-[#FFEFF8] text-ink",
                      )}
                    >
                      {m === "CASH" ? <Wallet size={20} /> : null}
                      {m === "CARD" ? <CreditCard size={20} /> : null}
                      {m === "TRANSFER" || m === "CHECK" ? <Landmark size={20} /> : null}
                      {m === "GIFT_CARD" ? <ShoppingBag size={20} /> : null}
                      {PAYMENT_METHOD_LABEL[m]}
                    </button>
                  ))}
                </div>
                {method === "CASH" && !cashOpen ? (
                  <p className="rounded-lg bg-[#FFDAD6] p-3 text-[13px] text-[#93000A]">
                    Ouvrez la caisse pour un paiement espèces.{" "}
                    {showCash ? (
                      <Link href="/cash-register/" className="font-semibold underline">
                        Aller à la caisse
                      </Link>
                    ) : null}
                  </p>
                ) : null}
                {method === "CASH" ? (
                  <label className="block text-[13px]">
                    <span className="mb-1 block font-semibold">Espèces reçues</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={cashGiven}
                      onChange={(e) => setCashGiven(e.target.value)}
                      className="h-11 w-full rounded-lg bg-[#FFEFF8] px-3 text-right text-[18px] font-bold outline-none"
                    />
                    <div className="mt-2 flex gap-2">
                      {[100, 200].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className="rounded-lg bg-white px-3 py-1.5 text-[13px] font-bold shadow-sm"
                          onClick={() => setCashGiven(String(n))}
                        >
                          {formatMad(n)}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="rounded-lg bg-[#FFDEA4] px-3 py-1.5 text-[13px] font-bold"
                        onClick={() => setCashGiven(String(total))}
                      >
                        Compte exact
                      </button>
                    </div>
                  </label>
                ) : null}
              </div>
              <div className="flex flex-col justify-between rounded-xl bg-[#FFEFF8] p-3 md:col-span-5">
                <p className="text-[11px] font-bold uppercase text-ink/40">Aperçu</p>
                <ul className="mt-2 space-y-1 text-[13px]">
                  {cart.map((l) => (
                    <li key={l.product.id} className="flex justify-between gap-2">
                      <span className="truncate">
                        {l.quantity}× {l.product.name}
                      </span>
                      <span className="shrink-0 font-semibold">{formatMad(l.product.salePrice * l.quantity)}</span>
                    </li>
                  ))}
                </ul>
                {method === "CASH" ? (
                  <div className="mt-3 flex justify-between rounded-lg bg-white p-2 text-[13px]">
                    <span className="font-bold uppercase text-ink/40">Monnaie</span>
                    <span className="font-black text-[#7B5900]">{formatMad(change)}</span>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 bg-[#FFEFF8] px-5 py-3">
              <button type="button" className="rounded-lg px-4 py-2.5 text-[14px] font-semibold text-ink/55" onClick={() => setPayOpen(false)}>
                Annuler
              </button>
              <button
                type="button"
                disabled={submitting || !canWrite || (method === "CASH" && !cashOpen)}
                onClick={handleCheckout}
                className="rounded-lg bg-primary px-5 py-2.5 text-[14px] font-bold text-white disabled:opacity-40"
              >
                {submitting ? "Encaissement…" : "Valider le ticket"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {lastSale ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="bg-[#FFEFF8] px-5 py-4">
              <h3 className="text-[18px] font-bold">Vente enregistrée</h3>
              <p className="text-[13px] text-ink/55">
                Ticket {lastSale.invoiceNumber} · {formatMad(lastSale.total)}
              </p>
            </div>
            <div className="space-y-3 p-5">
              <p className="text-[13px] text-ink/60">
                {lastSale.customerName ?? "Passage"} ·{" "}
                {PAYMENT_METHOD_LABEL[lastSale.paymentMethod]}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href={`/invoices/${lastSale.invoiceId}/`}
                  className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-center text-[14px] font-bold text-white"
                  onClick={() => setLastSale(null)}
                >
                  Voir la facture
                </Link>
                <Link
                  href={`/invoices/${lastSale.invoiceId}/?print=1`}
                  className="flex-1 rounded-lg bg-[#FFEFF8] px-4 py-2.5 text-center text-[14px] font-bold text-ink"
                  onClick={() => setLastSale(null)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Imprimer le ticket
                </Link>
              </div>
              <button
                type="button"
                className="w-full rounded-lg px-4 py-2 text-[14px] font-semibold text-ink/55"
                onClick={() => setLastSale(null)}
              >
                Nouvelle vente
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ProductGrid({
  title,
  hint,
  icon: Icon,
  items,
  onAdd,
}: {
  title: string;
  hint?: string;
  icon: typeof ShoppingBag;
  items: PosProductItem[];
  onAdd: (p: PosProductItem) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-primary" />
          <h2 className="text-[18px] font-semibold">{title}</h2>
        </div>
        {hint ? <span className="text-[11px] font-bold uppercase tracking-wider text-ink/40">{hint}</span> : null}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((p) => {
          const state = productStockState(p);
          return (
            <button
              key={p.id}
              type="button"
              disabled={state === "out"}
              onClick={() => onAdd(p)}
              className={cn(
                "flex h-36 flex-col justify-between rounded-xl bg-white p-3 text-left shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FCE9F4] text-primary">
                  <Icon size={16} />
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold",
                    state === "out" && "bg-[#FFDAD6] text-[#93000A]",
                    state === "low" && "bg-amber-100 text-amber-800",
                    state === "ok" && "bg-[#F0DDE9] text-ink/60",
                  )}
                >
                  {state === "out" ? "Hors stock" : `${p.stock} restants`}
                </span>
              </div>
              <div>
                <p className="line-clamp-1 text-[14px] font-semibold">{p.name}</p>
                <p className="text-[12px] text-ink/50">
                  {p.brand || PRODUCT_UNIT_LABEL[p.unit as ProductUnit] || p.sku}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[18px] font-bold text-primary">{formatMad(p.salePrice)}</span>
                <span className={cn("rounded px-2 py-1 text-[11px] font-bold", state === "out" ? "bg-[#F0DDE9] text-ink/40" : "bg-primary text-white")}>
                  {state === "out" ? "Indisponible" : "Ajouter"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
